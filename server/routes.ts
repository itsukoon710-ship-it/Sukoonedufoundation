import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import rateLimit from "express-rate-limit";
import { storage } from "./storage.js";
import { insertStudentSchema, insertCenterSchema, insertUserSchema, insertExamResultSchema, insertInterviewResultSchema, insertAdmissionYearSchema, insertSubjectSchema, insertStudentSubjectMarksSchema, type User } from "../shared/schema.js";

// Constants
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_ADMISSION_YEAR = 2026;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const isProduction = process.env.NODE_ENV === "production";

// Pagination helper
function getPaginationParams(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Helper function to get string param (handles Express 5 string | string[] type)
function getStringParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  if (param) return param;
  return "";
}

const PgSession = connectPg(session);

// Extend Express Request to include user type
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      name: string;
      role: string;
      centerId?: string | null;
      admissionYear: number;
    }
  }
}

// Rate limiter for login endpoint
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// Public registration rate limiter (more restrictive)
const publicRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 registrations per window
  message: { message: "Too many registration attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

function requireMarksEntry(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  const user = req.user as any;
  // Handle case where marksEntryPermission column doesn't exist
  const hasMarksEntryPermission = user.marksEntryPermission === true;
  if (user.role !== "admin" && user.role !== "examiner" && !hasMarksEntryPermission) {
    return res.status(403).json({ message: "Forbidden - Marks entry permission required" });
  }
  next();
}

function requireCoordinator(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  const user = req.user as any;
  if (user.role !== "admin" && user.role !== "coordinator") {
    return res.status(403).json({ message: "Forbidden - Coordinator access required" });
  }
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Trust proxy for Replit deployments (needed for secure cookies over HTTPS)
  app.set("trust proxy", 1);

  // Apply rate limiters
  app.use("/api/auth/login", loginRateLimiter);
  app.use("/api", apiRateLimiter);

  // Session setup - use pg session store with pool from ./db
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  
  // Use pg session store with the same pool from ./db
  app.use(session({
    secret: sessionSecret,
    store: new PgSession({
      pool: pool,
      tableName: 'session'
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
    },
  }));

  // Passport setup with bcrypt
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log("Login attempt:", username);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("User not found:", username);
        return done(null, false, { message: "Invalid credentials" });
      }
      
      console.log("User found, comparing password...");
      console.log("Stored password hash:", user.password);
      
      // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
      
      let isPasswordValid = false;
      
      if (isHashed) {
        // Compare hashed password
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // Password is plain text, compare directly
        isPasswordValid = (password === user.password);
        
        // If password is valid, hash it for future use
        if (isPasswordValid) {
          console.log("Password is plain text, hashing for future use...");
          const hashedPassword = await bcrypt.hash(password, 10);
          await storage.updateUser(user.id, { password: hashedPassword });
          console.log("Password hashed and updated successfully");
        }
      }
      
      console.log("Password valid:", isPasswordValid);
      
      if (!isPasswordValid) return done(null, false, { message: "Invalid credentials" });
      
      return done(null, user);
    } catch (err) {
      console.error("Login error:", err);
      return done(err);
    }
  }));

  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // HEALTH CHECK ENDPOINT
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // PUBLIC REGISTRATION ENDPOINT (No authentication required)
  app.post("/api/public/register", publicRegistrationLimiter, async (req, res) => {
    try {
      const raw = req.body;
      
      // Validate required fields
      const requiredFields = [
        'name', 'age', 'dateOfBirth', 'fatherName', 'fatherOccupation', 
        'motherName', 'phone', 'aadhaarNumber', 'village', 'district', 
        'state', 'address', 'previousSchool', 'classApplying', 'declaration'
      ];
      
      for (const field of requiredFields) {
        if (!raw[field] && raw[field] !== 0 && raw[field] !== false) {
          return res.status(400).json({ message: `Missing required field: ${field}` });
        }
      }

      // Validate phone number format (10 digits starting with 6-9)
      if (!/^[6-9]\d{9}$/.test(raw.phone)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      // Validate Aadhaar number (12 digits)
      if (!/^\d{12}$/.test(raw.aadhaarNumber)) {
        return res.status(400).json({ message: "Invalid Aadhaar number format" });
      }

      // Validate age (5-25)
      const age = parseInt(raw.age);
      if (isNaN(age) || age < 5 || age > 25) {
        return res.status(400).json({ message: "Age must be between 5 and 25" });
      }

      // Validate declaration
      if (raw.declaration !== true) {
        return res.status(400).json({ message: "Declaration must be accepted" });
      }

      // Check if public registration is enabled
      const admissionYears = await storage.getAdmissionYears();
      const activeYear = admissionYears.find(y => y.isActive);
      if (!activeYear?.publicRegistrationEnabled) {
        return res.status(403).json({ message: "Public registration is currently closed. Please check back later or contact support for more information." });
      }

      // Generate application ID
      const year = raw.admissionYear || DEFAULT_ADMISSION_YEAR;
      const applicationId = await storage.generateApplicationId(year);

      // Prepare student data
      const studentData = {
        name: raw.name,
        age: age,
        dateOfBirth: raw.dateOfBirth,
        gender: raw.gender || "Male",
        fatherName: raw.fatherName,
        fatherOccupation: raw.fatherOccupation,
        motherName: raw.motherName,
        mobile: raw.phone,
        phone: raw.phone,
        aadhaarNumber: raw.aadhaarNumber,
        village: raw.village,
        district: raw.district,
        state: raw.state,
        address: raw.address,
        previousSchool: raw.previousSchool,
        classApplying: raw.classApplying,
        photoUrl: raw.photoUrl || null,
        centerId: raw.centerId || null,
        coordinatorId: raw.coordinatorId || null,
        admissionYear: year,
        examDate: raw.examDate || null,
        examCenter: raw.examCenter || null,
        declaration: true,
      };

      const student = await storage.createStudent({ ...studentData, applicationId });
      
      res.status(201).json({ 
        message: "Application submitted successfully",
        applicationId: student.applicationId,
        id: student.id
      });
    } catch (err: any) {
      console.error("Public registration error:", err);
      res.status(500).json({ message: err.message || "Failed to submit application" });
    }
  });

  // PUBLIC GET STUDENT BY APPLICATION ID (for admit card generation)
  app.get("/api/public/student/:applicationId", async (req, res) => {
    try {
      const { applicationId } = req.params;
      
      const student = await storage.getStudentByApplicationId(applicationId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Return only necessary fields for admit card
      res.json({
        id: student.id,
        applicationId: student.applicationId,
        name: student.name,
        fatherName: student.fatherName,
        motherName: student.motherName,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        classApplying: student.classApplying,
        examCenter: student.examCenter,
        photoUrl: student.photoUrl,
        admissionYear: student.admissionYear,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // AUTH ROUTES
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = req.user as any;
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  // ADMISSION YEARS
  app.get("/api/admission-years", requireAuth, async (req, res) => {
    try {
      const years = await storage.getAdmissionYears();
      res.json(years);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admission-years", requireAdmin, async (req, res) => {
    try {
      const data = insertAdmissionYearSchema.parse(req.body);
      const year = await storage.createAdmissionYear(data);
      res.status(201).json(year);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/admission-years/:id", requireAdmin, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      const data = insertAdmissionYearSchema.partial().parse(req.body);
      const year = await storage.updateAdmissionYear(id, data);
      res.json(year);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // CENTERS
  app.get("/api/centers", requireAuth, async (req, res) => {
    try {
      const centers = await storage.getCenters();
      res.json(centers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/centers", requireAdmin, async (req, res) => {
    try {
      const data = insertCenterSchema.parse(req.body);
      const center = await storage.createCenter(data);
      res.status(201).json(center);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/centers/:id", requireAdmin, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      const data = insertCenterSchema.partial().parse(req.body);
      const center = await storage.updateCenter(id, data);
      res.json(center);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/centers/:id", requireAdmin, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      await storage.deleteCenter(id);
      res.json({ message: "Center deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // USERS
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.status(201).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      const data = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, data);
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      await storage.deleteUser(id);
      res.json({ message: "User deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // SUBJECTS
  app.get("/api/subjects", requireAuth, async (req, res) => {
    try {
      const subjects = await storage.getSubjects();
      res.json(subjects);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/subjects", requireAdmin, async (req, res) => {
    try {
      const data = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(data);
      res.status(201).json(subject);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/subjects/:id", requireAdmin, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      const data = insertSubjectSchema.partial().parse(req.body);
      const subject = await storage.updateSubject(id, data);
      res.json(subject);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/subjects/:id", requireAdmin, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      await storage.deleteSubject(id);
      res.json({ message: "Subject deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // STUDENTS
  app.get("/api/students", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { page, limit, offset } = getPaginationParams(req);
      const filters: any = {};
      
      if (req.query.status) filters.status = req.query.status;
      if (req.query.admissionYear) filters.admissionYear = parseInt(req.query.admissionYear as string);
      if (req.query.centerId) filters.centerId = req.query.centerId;
      if (req.query.coordinatorId) filters.coordinatorId = req.query.coordinatorId;
      if (req.query.search) filters.search = req.query.search;
      
      // Coordinators can only see their own students
      if (user.role === "coordinator") {
        filters.coordinatorId = user.id;
      }
      
      const result = await storage.getStudents(filters, { limit, offset });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get all students for export (no pagination)
  app.get("/api/students/export", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const filters: any = {};
      
      if (req.query.status) filters.status = req.query.status;
      if (req.query.admissionYear) filters.admissionYear = parseInt(req.query.admissionYear as string);
      if (req.query.centerId) filters.centerId = req.query.centerId;
      if (req.query.coordinatorId) filters.coordinatorId = req.query.coordinatorId;
      if (req.query.search) filters.search = req.query.search;
      
      // Coordinators can only see their own students
      if (user.role === "coordinator") {
        filters.coordinatorId = user.id;
      }
      
      // Get all students without pagination (limit: 10000)
      const result = await storage.getStudents(filters, { limit: 10000, offset: 0 });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get student counts for stats (no pagination)
  app.get("/api/students/counts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const filters: { coordinatorId?: string; centerId?: string; admissionYear?: number } = {};
      
      if (req.query.admissionYear) filters.admissionYear = parseInt(req.query.admissionYear as string);
      if (req.query.centerId) filters.centerId = req.query.centerId as string;
      
      // Coordinators can only see their own students
      if (user.role === "coordinator") {
        filters.coordinatorId = user.id;
      }
      
      const counts = await storage.getStudentCounts(filters);
      res.json(counts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      const student = await storage.getStudentById(id);
      if (!student) return res.status(404).json({ message: "Student not found" });
      res.json(student);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertStudentSchema.parse(req.body);
      
      // Generate application ID
      const year = data.admissionYear || DEFAULT_ADMISSION_YEAR;
      const applicationId = await storage.generateApplicationId(year);
      
      // Coordinators can only add students to their own center
      if (user.role === "coordinator") {
        data.coordinatorId = user.id;
        if (user.centerId) {
          data.centerId = user.centerId;
        }
      }
      
      const student = await storage.createStudent({ ...data, applicationId });
      res.status(201).json(student);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      const user = req.user as any;
      const data = insertStudentSchema.partial().parse(req.body);
      
      // Coordinators can only update their own students
      if (user.role === "coordinator") {
        const student = await storage.getStudentById(id);
        if (!student || student.coordinatorId !== user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const student = await storage.updateStudent(id, data);
      res.json(student);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/students/:id", requireAdmin, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      await storage.deleteStudent(id);
      res.json({ message: "Student deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // EXAM RESULTS
  app.get("/api/exam-results", requireAuth, async (req, res) => {
    try {
      const results = await storage.getExamResults();
      
      // Get admission year settings for dynamic calculation
      const admissionYears = await storage.getAdmissionYears();
      const activeYear = admissionYears.find(y => y.isActive);
      
      let selectionCriteria = null;
      if (activeYear) {
        const subjects = await storage.getSubjects(activeYear.year);
        const activeSubjects = subjects.filter(s => s.isActive);
        selectionCriteria = {
          selectionMode: activeYear.selectionMode,
          minSubjectsToPass: activeYear.minSubjectsToPass,
          totalCutoffMarks: activeYear.totalCutoffMarks,
          totalSubjects: activeSubjects.length,
        };
      }
      
      res.json({ results, selectionCriteria });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/exam-results", requireMarksEntry, async (req, res) => {
    try {
      const data = insertExamResultSchema.parse(req.body);
      const result = await storage.createExamResult(data);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/exam-results/:id", requireMarksEntry, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      const data = insertExamResultSchema.partial().parse(req.body);
      const result = await storage.updateExamResult(id, data);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // STUDENT SUBJECT MARKS
  app.get("/api/student-subject-marks/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = getStringParam(req.params.studentId);
      const marks = await storage.getStudentSubjectMarks(studentId);
      res.json(marks);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/student-subject-marks", requireMarksEntry, async (req, res) => {
    try {
      const { studentId, marks } = req.body;
      
      if (!studentId || !marks || !Array.isArray(marks)) {
        return res.status(400).json({ message: "Invalid request body" });
      }
      
      // Delete existing marks for this student
      await storage.deleteStudentSubjectMarks(studentId);
      
      // Insert new marks
      const results = [];
      for (const mark of marks) {
        const data = insertStudentSubjectMarksSchema.parse({
          studentId,
          subjectId: mark.subjectId,
          marks: mark.marks,
        });
        const result = await storage.createStudentSubjectMarks(data);
        results.push(result);
      }
      
      // Calculate exam result
      const subjects = await storage.getSubjects();
      const activeSubjects = subjects.filter(s => s.isActive);
      
      let totalMarks = 0;
      let totalMaxMarks = 0;
      let subjectsPassed = 0;
      
      for (const subject of activeSubjects) {
        const mark = marks.find(m => m.subjectId === subject.id);
        if (mark) {
          totalMarks += mark.marks;
          totalMaxMarks += subject.maxMarks;
          if (mark.marks >= subject.passingMarks) {
            subjectsPassed++;
          }
        }
      }
      
      // Get admission year settings
      const admissionYears = await storage.getAdmissionYears();
      const activeYear = admissionYears.find(y => y.isActive);
      
      let selectedForInterview = false;
      if (activeYear) {
        if (activeYear.selectionMode === "all_pass") {
          selectedForInterview = subjectsPassed === activeSubjects.length;
        } else if (activeYear.selectionMode === "min_subjects") {
          selectedForInterview = subjectsPassed >= (activeYear.minSubjectsToPass || 3);
        } else if (activeYear.selectionMode === "total_marks") {
          selectedForInterview = totalMarks >= (activeYear.totalCutoffMarks || 120);
        }
      }
      
      // Update or create exam result
      const existingResult = await storage.getExamResultByStudentId(studentId);
      if (existingResult) {
        await storage.updateExamResult(existingResult.id, {
          marks: totalMarks,
          maxMarks: totalMaxMarks,
          selectedForInterview,
        });
      } else {
        await storage.createExamResult({
          studentId,
          marks: totalMarks,
          maxMarks: totalMaxMarks,
        });
      }
      
      // Update student status
      if (selectedForInterview) {
        await storage.updateStudent(studentId, { status: "selected_for_interview" });
      } else {
        await storage.updateStudent(studentId, { status: "exam_done" });
      }
      
      res.json({
        totalMarks,
        totalMaxMarks,
        subjectsPassed,
        selectedForInterview,
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // INTERVIEW RESULTS
  app.get("/api/interview-results", requireAuth, async (req, res) => {
    try {
      const results = await storage.getInterviewResults();
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/interview-results", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertInterviewResultSchema.parse(req.body);
      
      // Only admin and coordinators can submit interview results
      if (user.role !== "admin" && user.role !== "coordinator") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await storage.createInterviewResult({
        ...data,
        interviewedBy: user.id,
      });
      
      // Update student status based on decision
      const statusMap: Record<string, string> = {
        selected: "admitted",
        waitlisted: "waitlisted",
        rejected: "rejected",
      };
      
      await storage.updateStudent(data.studentId, {
        status: statusMap[data.decision] as any,
      });
      
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/interview-results/:id", requireAuth, async (req, res) => {
    try {
      const id = getStringParam(req.params.id);
      const user = req.user as any;
      const data = insertInterviewResultSchema.partial().parse(req.body);
      
      // Only admin and coordinators can update interview results
      if (user.role !== "admin" && user.role !== "coordinator") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await storage.updateInterviewResult(id, data);
      
      // Update student status if decision changed
      if (data.decision) {
        const statusMap: Record<string, string> = {
          selected: "admitted",
          waitlisted: "waitlisted",
          rejected: "rejected",
        };
        
        await storage.updateStudent(result.studentId, {
          status: statusMap[data.decision] as any,
        });
      }
      
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

   // PUBLIC RESULT CHECKING ENDPOINTS (No authentication required)
   app.get("/api/public/results-published", async (req, res) => {
     try {
       const admissionYears = await storage.getAdmissionYears();
       const activeYear = admissionYears.find(y => y.isActive);
       // Check if results are published (using a flag in admission year or checking if exam results exist)
       const published = activeYear?.resultsPublished || false;
       res.json({ published });
     } catch (err: any) {
       res.status(500).json({ message: err.message });
     }
   });

   app.get("/api/public/registration-enabled", async (req, res) => {
     try {
       const admissionYears = await storage.getAdmissionYears();
       const activeYear = admissionYears.find(y => y.isActive);
       // Check if public registration is enabled
       const enabled = activeYear?.publicRegistrationEnabled ?? true;
       res.json({ enabled });
     } catch (err: any) {
       res.status(500).json({ message: err.message });
     }
   });

   app.post("/api/public/check-result", publicRegistrationLimiter, async (req, res) => {
     try {
       const { rollNumber } = req.body;
       
       console.log("Check result request for roll number:", rollNumber);
       
       if (!rollNumber) {
         return res.status(400).json({ message: "Roll number is required" });
       }
       
       // Find student by application ID (roll number)
       let student = await storage.getStudentByApplicationId(rollNumber);
       
       // If not found, try to format the roll number
       if (!student) {
         // Try to extract year and number from the roll number
         const match = rollNumber.match(/(\d{4})[-\s]?(\d{1,4})/);
         if (match) {
           const year = match[1];
           const num = match[2].padStart(4, "0");
           const formattedRollNumber = `SKN-${year}-${num}`;
           console.log("Trying formatted roll number:", formattedRollNumber);
           student = await storage.getStudentByApplicationId(formattedRollNumber);
         }
         
         // If still not found, try to add SKN- prefix
         if (!student && !rollNumber.startsWith("SKN-")) {
           const formattedRollNumber = `SKN-${rollNumber}`;
           console.log("Trying with SKN- prefix:", formattedRollNumber);
           student = await storage.getStudentByApplicationId(formattedRollNumber);
         }
         
         // If still not found, try to add SKN-2026- prefix
         if (!student && !rollNumber.startsWith("SKN-")) {
           const formattedRollNumber = `SKN-2026-${rollNumber.padStart(4, "0")}`;
           console.log("Trying with SKN-2026- prefix:", formattedRollNumber);
           student = await storage.getStudentByApplicationId(formattedRollNumber);
         }
       }
       
       console.log("Student found:", student ? "Yes" : "No", student ? student.id : "N/A");
       
       if (!student) {
         return res.status(404).json({ message: "No result found for this roll number" });
       }
       
       // Check if results are published
       const admissionYears = await storage.getAdmissionYears();
       const activeYear = admissionYears.find(y => y.isActive);
       
       console.log("Active year:", activeYear ? activeYear.year : "N/A", "Results published:", activeYear?.resultsPublished);
       
       if (!activeYear?.resultsPublished) {
         return res.status(403).json({ message: "Results are not yet published" });
       }
       
       // Get exam result
       const examResult = await storage.getExamResultByStudentId(student.id);
       
       console.log("Exam result found:", examResult ? "Yes" : "No", examResult ? examResult.id : "N/A");
       
if (!examResult) {
          return res.status(404).json({ message: "Exam result not found" });
        }
        
        // Get student subject marks for dynamic comparison
        const studentSubjectMarks = await storage.getStudentSubjectMarks(student.id);
        
        // Get exam settings for dynamic comparison
        const subjects = await storage.getSubjects(activeYear.year);
        const activeSubjects = subjects.filter(s => s.isActive);
        const passCount = activeSubjects.reduce((count, sub) => {
          const subjectMark = studentSubjectMarks.find(m => m.subjectId === sub.id);
          return count + (subjectMark && subjectMark.marks >= sub.passingMarks ? 1 : 0);
        }, 0);
        const totalMarks = studentSubjectMarks.reduce((sum, m) => sum + m.marks, 0);
        
        let isSelected = false;
        if (activeYear.selectionMode === "all_pass") {
          isSelected = passCount === activeSubjects.length;
        } else if (activeYear.selectionMode === "min_subjects") {
          isSelected = passCount >= (activeYear.minSubjectsToPass || 3);
        } else if (activeYear.selectionMode === "total_marks") {
          isSelected = totalMarks >= (activeYear.totalCutoffMarks || 120);
        }
        
        res.json({
          rollNumber: student.applicationId,
          name: student.name,
          marks: examResult.marks,
          maxMarks: examResult.maxMarks,
          selectedForInterview: isSelected,
          status: student.status,
          selectionMode: activeYear.selectionMode,
          minSubjectsToPass: activeYear.minSubjectsToPass,
          totalCutoffMarks: activeYear.totalCutoffMarks,
          subjectsPassed: passCount,
          totalSubjects: activeSubjects.length,
          totalMarks,
        });
     } catch (err: any) {
       res.status(500).json({ message: err.message });
     }
   });

   // ADMIN PUBLISH RESULTS ENDPOINT
   app.post("/api/admin/publish-results", requireAdmin, async (req, res) => {
     try {
       const { admissionYear } = req.body;
       const year = admissionYear || DEFAULT_ADMISSION_YEAR;
       
       // Update admission year to mark results as published
       const admissionYears = await storage.getAdmissionYears();
       const yearToUpdate = admissionYears.find(y => y.year === year);
       
       if (!yearToUpdate) {
         return res.status(404).json({ message: "Admission year not found" });
       }
       
       await storage.updateAdmissionYear(yearToUpdate.id, { resultsPublished: true });
       
       res.json({ message: "Results published successfully", year });
     } catch (err: any) {
       res.status(500).json({ message: err.message });
     }
   });

   app.post("/api/admin/unpublish-results", requireAdmin, async (req, res) => {
     try {
       const { admissionYear } = req.body;
       const year = admissionYear || DEFAULT_ADMISSION_YEAR;

       // Update admission year to mark results as unpublished
       const admissionYears = await storage.getAdmissionYears();
       const yearToUpdate = admissionYears.find(y => y.year === year);

       if (!yearToUpdate) {
         return res.status(404).json({ message: "Admission year not found" });
       }

       await storage.updateAdmissionYear(yearToUpdate.id, { resultsPublished: false });

       res.json({ message: "Results unpublished successfully", year });
     } catch (err: any) {
       res.status(500).json({ message: err.message });
     }
   });

   app.post("/api/admin/toggle-public-registration", requireAdmin, async (req, res) => {
     try {
       const { admissionYear, enabled } = req.body;
       const year = admissionYear || DEFAULT_ADMISSION_YEAR;

       // Update admission year to toggle public registration
       const admissionYears = await storage.getAdmissionYears();
       const yearToUpdate = admissionYears.find(y => y.year === year);

       if (!yearToUpdate) {
         return res.status(404).json({ message: "Admission year not found" });
       }

       await storage.updateAdmissionYear(yearToUpdate.id, { publicRegistrationEnabled: enabled });

       res.json({ message: `Public registration ${enabled ? 'enabled' : 'disabled'} successfully`, year });
     } catch (err: any) {
       res.status(500).json({ message: err.message });
     }
   });

   // DASHBOARD STATS
   app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
     try {
       const user = req.user as any;
       const admissionYear = req.query.admissionYear ? parseInt(req.query.admissionYear as string) : undefined;
       const coordinatorId = user.role === "coordinator" ? user.id : undefined;
       const stats = await storage.getDashboardStats(admissionYear, coordinatorId);
       res.json(stats);
     } catch (err: any) {
       res.status(500).json({ message: err.message });
     }
   });

   // ADMIN DASHBOARD STATS
   app.get("/api/admin/dashboard/stats", requireAuth, async (req, res) => {
     try {
       const user = req.user as any;
       // Only allow admin access
       if (user.role !== "admin") {
         return res.status(403).json({ message: "Forbidden - Admin access required" });
       }
       const admissionYear = req.query.admissionYear ? parseInt(req.query.admissionYear as string) : undefined;
       const stats = await storage.getAdminDashboardStats(admissionYear);
       res.json(stats);
     } catch (err: any) {
       res.status(500).json({ message: err.message });
     }
   });

  return httpServer;
}
