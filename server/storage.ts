import { db } from "./db.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  users, centers, students, examResults, interviewResults, admissionYears,
  subjects, studentSubjectMarks,
  type User, type InsertUser,
  type Center, type InsertCenter,
  type Student, type InsertStudent,
  type ExamResult, type InsertExamResult,
  type InterviewResult, type InsertInterviewResult,
  type AdmissionYear, type InsertAdmissionYear,
  type Subject, type InsertSubject,
  type StudentSubjectMarks, type InsertStudentSubjectMarks,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// Password hashing constant
const SALT_ROUNDS = 10;

export interface IStorage {
  // Auth
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;

  // Admission Years
  getAdmissionYears(): Promise<AdmissionYear[]>;
  getActiveAdmissionYear(): Promise<AdmissionYear | undefined>;
  createAdmissionYear(data: InsertAdmissionYear): Promise<AdmissionYear>;
  updateAdmissionYear(id: string, data: Partial<InsertAdmissionYear>): Promise<AdmissionYear>;

  // Centers
  getCenters(admissionYear?: number): Promise<Center[]>;
  getCenterById(id: string): Promise<Center | undefined>;
  createCenter(data: InsertCenter): Promise<Center>;
  updateCenter(id: string, data: Partial<InsertCenter>): Promise<Center>;
  deleteCenter(id: string): Promise<void>;

  // Users
  getUsers(): Promise<User[]>;
  getCoordinators(): Promise<User[]>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Subjects
  getSubjects(admissionYear?: number): Promise<Subject[]>;
  getSubjectById(id: string): Promise<Subject | undefined>;
  createSubject(data: InsertSubject): Promise<Subject>;
  updateSubject(id: string, data: Partial<InsertSubject>): Promise<Subject>;
  deleteSubject(id: string): Promise<void>;

  // Student Subject Marks
  getStudentSubjectMarks(studentId: string): Promise<(StudentSubjectMarks & { subject: Subject })[]>;
  getSubjectMarksByYear(admissionYear: number): Promise<(StudentSubjectMarks & { subject: Subject; student: Student })[]>;
  upsertStudentSubjectMark(studentId: string, subjectId: string, marks: number): Promise<StudentSubjectMarks>;
  createStudentSubjectMarks(data: InsertStudentSubjectMarks): Promise<StudentSubjectMarks>;
  deleteStudentSubjectMarks(studentId: string): Promise<void>;

  // Students
  getStudents(filters?: { coordinatorId?: string; centerId?: string; admissionYear?: number; status?: string }, pagination?: { limit: number; offset: number }): Promise<{ students: Student[]; total: number }>;
  getStudentById(id: string): Promise<Student | undefined>;
  getStudentByApplicationId(applicationId: string): Promise<Student | undefined>;
  createStudent(data: InsertStudent & { applicationId: string }): Promise<Student>;
  updateStudent(id: string, data: Partial<Student>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  // Exam Results (summary)
  getExamResults(admissionYear?: number): Promise<(ExamResult & { student: Student })[]>;
  getExamResultByStudentId(studentId: string): Promise<ExamResult | undefined>;
  createExamResult(data: InsertExamResult): Promise<ExamResult>;
  updateExamResult(id: string, data: Partial<ExamResult>): Promise<ExamResult>;

  // Interview Results
  getInterviewResults(admissionYear?: number): Promise<(InterviewResult & { student: Student })[]>;
  getInterviewResultByStudentId(studentId: string): Promise<InterviewResult | undefined>;
  createInterviewResult(data: InsertInterviewResult): Promise<InterviewResult>;
  updateInterviewResult(id: string, data: Partial<InterviewResult>): Promise<InterviewResult>;

  // Dashboard
  getDashboardStats(admissionYear?: number, coordinatorId?: string): Promise<{
    totalStudents: number;
    examCompleted: number;
    interviewSelected: number;
    finalAdmissions: number;
    studentsByCenter: { centerName: string; count: number }[];
    studentsByCoordinator: { coordinatorName: string; center: string; count: number }[];
  }>;

  // Admin Dashboard
  getAdminDashboardStats(admissionYear?: number): Promise<{
    totalStudents: number;
    examCompleted: number;
    interviewSelected: number;
    finalAdmissions: number;
    centers: { 
      centerName: string; 
      total: number; 
      admitted: number; 
      waitlisted: number; 
      rejected: number 
    }[];
    studentsByState: { state: string; count: number }[];
    studentsByAge: { ageGroup: string; count: number }[];
  }>;

  // Generate app ID
  generateApplicationId(admissionYear: number): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error: any) {
      // Handle case where marks_entry_permission column doesn't exist
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('marks_entry_permission') || errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.log('marks_entry_permission column does not exist, fetching without it');
        const result = await db.select({
          id: users.id,
          username: users.username,
          password: users.password,
          name: users.name,
          role: users.role,
          centerId: users.centerId,
          admissionYear: users.admissionYear,
          createdAt: users.createdAt,
        }).from(users).where(eq(users.username, username)).limit(1);
        if (result[0]) {
          return { ...result[0], marksEntryPermission: false } as User;
        }
        return undefined;
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error: any) {
      // Handle case where marks_entry_permission column doesn't exist
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('marks_entry_permission') || errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.log('marks_entry_permission column does not exist, fetching without it');
        const result = await db.select({
          id: users.id,
          username: users.username,
          password: users.password,
          name: users.name,
          role: users.role,
          centerId: users.centerId,
          admissionYear: users.admissionYear,
          createdAt: users.createdAt,
        }).from(users).where(eq(users.id, id)).limit(1);
        if (result[0]) {
          return { ...result[0], marksEntryPermission: false } as User;
        }
        return undefined;
      }
      throw error;
    }
  }

  async getAdmissionYears(): Promise<AdmissionYear[]> {
    return db.select().from(admissionYears).orderBy(desc(admissionYears.year));
  }

  async getActiveAdmissionYear(): Promise<AdmissionYear | undefined> {
    const result = await db.select().from(admissionYears).where(eq(admissionYears.isActive, true)).limit(1);
    return result[0];
  }

  async createAdmissionYear(data: InsertAdmissionYear): Promise<AdmissionYear> {
    const id = randomUUID();
    const result = await db.insert(admissionYears).values({ ...data, id }).returning();
    return result[0];
  }

  async updateAdmissionYear(id: string, data: Partial<InsertAdmissionYear>): Promise<AdmissionYear> {
    const result = await db.update(admissionYears).set(data).where(eq(admissionYears.id, id)).returning();
    return result[0];
  }

  async getCenters(admissionYear?: number): Promise<Center[]> {
    if (admissionYear) {
      return db.select().from(centers).where(eq(centers.admissionYear, admissionYear)).orderBy(centers.name);
    }
    return db.select().from(centers).orderBy(centers.name);
  }

  async getCenterById(id: string): Promise<Center | undefined> {
    const result = await db.select().from(centers).where(eq(centers.id, id)).limit(1);
    return result[0];
  }

  async createCenter(data: InsertCenter): Promise<Center> {
    const id = randomUUID();
    const result = await db.insert(centers).values({ ...data, id }).returning();
    return result[0];
  }

  async updateCenter(id: string, data: Partial<InsertCenter>): Promise<Center> {
    const result = await db.update(centers).set(data).where(eq(centers.id, id)).returning();
    return result[0];
  }

  async deleteCenter(id: string): Promise<void> {
    await db.delete(centers).where(eq(centers.id, id));
  }

  async getUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(users.name);
    } catch (error: any) {
      // Handle case where marks_entry_permission column doesn't exist
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('marks_entry_permission') || errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.log('marks_entry_permission column does not exist, fetching without it');
        const result = await db.select({
          id: users.id,
          username: users.username,
          password: users.password,
          name: users.name,
          role: users.role,
          centerId: users.centerId,
          admissionYear: users.admissionYear,
          createdAt: users.createdAt,
        }).from(users).orderBy(users.name);
        return result.map(u => ({ ...u, marksEntryPermission: false } as User));
      }
      throw error;
    }
  }

  async getCoordinators(): Promise<User[]> {
    try {
      return await db.select().from(users).where(eq(users.role, "coordinator")).orderBy(users.name);
    } catch (error: any) {
      // Handle case where marks_entry_permission column doesn't exist
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('marks_entry_permission') || errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.log('marks_entry_permission column does not exist, fetching without it');
        const result = await db.select({
          id: users.id,
          username: users.username,
          password: users.password,
          name: users.name,
          role: users.role,
          centerId: users.centerId,
          admissionYear: users.admissionYear,
          createdAt: users.createdAt,
        }).from(users).where(eq(users.role, "coordinator")).orderBy(users.name);
        return result.map(u => ({ ...u, marksEntryPermission: false } as User));
      }
      throw error;
    }
  }

  async createUser(data: InsertUser): Promise<User> {
    const id = randomUUID();
    // Hash the password before storing
    console.log("Creating user with password:", data.password);
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    console.log("Hashed password:", hashedPassword);

    // Automatically grant marks entry permission to examiners
    const userData = data.role === "examiner" ? { ...data, marksEntryPermission: true } : data;

    try {
      const result = await db.insert(users).values({ ...userData, password: hashedPassword, id }).returning();
      return result[0];
    } catch (error: any) {
      // Handle case where marks_entry_permission column doesn't exist
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('marks_entry_permission') || errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.log('marks_entry_permission column does not exist, creating without it');
        const { marksEntryPermission, ...dataWithoutPermission } = userData;
        const result = await db.insert(users).values({ ...dataWithoutPermission, password: hashedPassword, id }).returning();
        return result[0];
      }
      throw error;
    }
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    // Hash the password if it's being updated and not empty
    const updateData = { ...data };
    if (updateData.password && updateData.password.trim() !== "") {
      console.log("Updating user password, hashing...");
      updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
      console.log("Hashed password:", updateData.password);
    } else {
      // Remove password from update data if it's empty to keep existing password
      delete updateData.password;
    }
    
    try {
      const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
      return result[0];
    } catch (error: any) {
      // Handle case where marks_entry_permission column doesn't exist
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('marks_entry_permission') || errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.log('marks_entry_permission column does not exist, updating without it');
        const { marksEntryPermission, ...updateDataWithoutPermission } = updateData;
        const result = await db.update(users).set(updateDataWithoutPermission).where(eq(users.id, id)).returning();
        return result[0];
      }
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    // First, clear the coordinatorId from all students that reference this user
    await db.update(students).set({ coordinatorId: null }).where(eq(students.coordinatorId, id));
    // Then, delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  // SUBJECTS
  async getSubjects(admissionYear?: number): Promise<Subject[]> {
    if (admissionYear) {
      return db.select().from(subjects)
        .where(eq(subjects.admissionYear, admissionYear))
        .orderBy(subjects.orderIndex, subjects.name);
    }
    return db.select().from(subjects).orderBy(subjects.orderIndex, subjects.name);
  }

  async getSubjectById(id: string): Promise<Subject | undefined> {
    const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    return result[0];
  }

  async createSubject(data: InsertSubject): Promise<Subject> {
    const id = randomUUID();
    const result = await db.insert(subjects).values({ ...data, id }).returning();
    return result[0];
  }

  async updateSubject(id: string, data: Partial<InsertSubject>): Promise<Subject> {
    const result = await db.update(subjects).set(data).where(eq(subjects.id, id)).returning();
    return result[0];
  }

  async deleteSubject(id: string): Promise<void> {
    await db.delete(studentSubjectMarks).where(eq(studentSubjectMarks.subjectId, id));
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  // STUDENT SUBJECT MARKS
  async getStudentSubjectMarks(studentId: string): Promise<(StudentSubjectMarks & { subject: Subject })[]> {
    // Use JOIN to avoid N+1 queries
    const resultsRaw = await db.select({
      id: studentSubjectMarks.id,
      studentId: studentSubjectMarks.studentId,
      subjectId: studentSubjectMarks.subjectId,
      marks: studentSubjectMarks.marks,
      createdAt: studentSubjectMarks.createdAt,
      subjectId2: subjects.id,
      subjectAdmissionYear: subjects.admissionYear,
      subjectName: subjects.name,
      code: subjects.code,
      maxMarks: subjects.maxMarks,
      passingMarks: subjects.passingMarks,
      isActive: subjects.isActive,
      orderIndex: subjects.orderIndex,
      subjectCreatedAt: subjects.createdAt,
    })
    .from(studentSubjectMarks)
    .leftJoin(subjects, eq(studentSubjectMarks.subjectId, subjects.id))
    .where(eq(studentSubjectMarks.studentId, studentId));

    return resultsRaw
      .filter(r => r.subjectId2 !== null)
      .map(r => ({
        id: r.id,
        studentId: r.studentId,
        subjectId: r.subjectId,
        marks: r.marks,
        createdAt: r.createdAt,
        subject: {
          id: r.subjectId2!,
          admissionYear: r.subjectAdmissionYear!,
          name: r.subjectName!,
          code: r.code!,
          maxMarks: r.maxMarks!,
          passingMarks: r.passingMarks!,
          isActive: r.isActive!,
          orderIndex: r.orderIndex!,
          createdAt: r.subjectCreatedAt!,
        },
      }));
  }

  async getSubjectMarksByYear(admissionYear: number): Promise<(StudentSubjectMarks & { subject: Subject; student: Student })[]> {
    const yearSubjects = await this.getSubjects(admissionYear);
    const subjectIds = yearSubjects.map(s => s.id);
    if (subjectIds.length === 0) return [];

    // Use JOIN to avoid N+1 queries
    const resultsRaw = await db.select({
      id: studentSubjectMarks.id,
      studentId: studentSubjectMarks.studentId,
      subjectId: studentSubjectMarks.subjectId,
      marks: studentSubjectMarks.marks,
      createdAt: studentSubjectMarks.createdAt,
      subjectId2: subjects.id,
      subjectAdmissionYear: subjects.admissionYear,
      subjectName: subjects.name,
      code: subjects.code,
      maxMarks: subjects.maxMarks,
      passingMarks: subjects.passingMarks,
      isActive: subjects.isActive,
      orderIndex: subjects.orderIndex,
      subjectCreatedAt: subjects.createdAt,
      studentId2: students.id,
      applicationId: students.applicationId,
      name: students.name,
      age: students.age,
      dateOfBirth: students.dateOfBirth,
      gender: students.gender,
      fatherName: students.fatherName,
      fatherOccupation: students.fatherOccupation,
      motherName: students.motherName,
      mobile: students.mobile,
      phone: students.phone,
      aadhaarNumber: students.aadhaarNumber,
      village: students.village,
      district: students.district,
      state: students.state,
      address: students.address,
      previousSchool: students.previousSchool,
      classApplying: students.classApplying,
      photoUrl: students.photoUrl,
      centerId: students.centerId,
      coordinatorId: students.coordinatorId,
      admissionYear2: students.admissionYear,
      status: students.status,
      examDate: students.examDate,
      examCenter: students.examCenter,
      declaration: students.declaration,
      studentCreatedAt: students.createdAt,
    })
    .from(studentSubjectMarks)
    .leftJoin(subjects, eq(studentSubjectMarks.subjectId, subjects.id))
    .leftJoin(students, eq(studentSubjectMarks.studentId, students.id))
    .where(inArray(studentSubjectMarks.subjectId, subjectIds));

    return resultsRaw
      .filter(r => r.subjectId2 !== null && r.studentId2 !== null)
      .map(r => ({
        id: r.id,
        studentId: r.studentId,
        subjectId: r.subjectId,
        marks: r.marks,
        createdAt: r.createdAt,
        subject: {
          id: r.subjectId2!,
          admissionYear: r.subjectAdmissionYear!,
          name: r.subjectName!,
          code: r.code!,
          maxMarks: r.maxMarks!,
          passingMarks: r.passingMarks!,
          isActive: r.isActive!,
          orderIndex: r.orderIndex!,
          createdAt: r.subjectCreatedAt!,
        },
         student: {
           id: r.studentId2!,
           applicationId: r.applicationId!,
           name: r.name!,
           age: r.age!,
           dateOfBirth: r.dateOfBirth!,
           gender: r.gender!,
           fatherName: r.fatherName!,
           fatherOccupation: r.fatherOccupation!,
           motherName: r.motherName!,
           mobile: r.mobile!,
           phone: r.phone!,
           aadhaarNumber: r.aadhaarNumber!,
          village: r.village!,
          district: r.district!,
          state: r.state!,
          address: r.address!,
          previousSchool: r.previousSchool!,
          classApplying: r.classApplying!,
          photoUrl: r.photoUrl ?? null,
          centerId: r.centerId ?? null,
          coordinatorId: r.coordinatorId ?? null,
          admissionYear: r.admissionYear2!,
          status: r.status!,
          examDate: r.examDate ?? null,
          examCenter: r.examCenter ?? null,
          declaration: r.declaration!,
          createdAt: r.studentCreatedAt!,
        },
      }));
  }

  async upsertStudentSubjectMark(studentId: string, subjectId: string, marks: number): Promise<StudentSubjectMarks> {
    const existing = await db.select().from(studentSubjectMarks)
      .where(and(
        eq(studentSubjectMarks.studentId, studentId),
        eq(studentSubjectMarks.subjectId, subjectId)
      )).limit(1);

    if (existing[0]) {
      const result = await db.update(studentSubjectMarks)
        .set({ marks })
        .where(eq(studentSubjectMarks.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      const id = randomUUID();
      const result = await db.insert(studentSubjectMarks)
        .values({ id, studentId, subjectId, marks })
        .returning();
      return result[0];
    }
  }

  async deleteStudentSubjectMarks(studentId: string): Promise<void> {
    await db.delete(studentSubjectMarks).where(eq(studentSubjectMarks.studentId, studentId));
  }

  async createStudentSubjectMarks(data: InsertStudentSubjectMarks): Promise<StudentSubjectMarks> {
    const id = randomUUID();
    const result = await db.insert(studentSubjectMarks).values({ ...data, id }).returning();
    return result[0];
  }

  async getStudents(filters?: { coordinatorId?: string; centerId?: string; admissionYear?: number; status?: string }, pagination?: { limit: number; offset: number }): Promise<{ students: Student[]; total: number }> {
    const conditions = [];
    if (filters?.coordinatorId) conditions.push(eq(students.coordinatorId, filters.coordinatorId));
    if (filters?.centerId) conditions.push(eq(students.centerId, filters.centerId));
    if (filters?.admissionYear) conditions.push(eq(students.admissionYear, filters.admissionYear));
    if (filters?.status) conditions.push(eq(students.status, filters.status as any));
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(students);
    let total = Number(countResult[0].count);
    
    // Build query based on conditions
    let studentList: Student[];
    if (conditions.length > 0) {
      studentList = await db.select().from(students)
        .where(and(...conditions))
        .orderBy(desc(students.createdAt))
        .limit(pagination?.limit ?? 100)
        .offset(pagination?.offset ?? 0);
    } else {
      studentList = await db.select().from(students)
        .orderBy(desc(students.createdAt))
        .limit(pagination?.limit ?? 100)
        .offset(pagination?.offset ?? 0);
    }
    
    return { students: studentList, total };
  }

  async getStudentById(id: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return result[0];
  }

  async getStudentByApplicationId(applicationId: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.applicationId, applicationId)).limit(1);
    return result[0];
  }

  async createStudent(data: InsertStudent & { applicationId: string }): Promise<Student> {
    const id = randomUUID();
    const result = await db.insert(students).values({ ...data, id }).returning();
    return result[0];
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student> {
    const result = await db.update(students).set(data).where(eq(students.id, id)).returning();
    return result[0];
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  async getExamResults(admissionYear?: number): Promise<(ExamResult & { student: Student })[]> {
    // Use JOIN to avoid N+1 queries
    let query = db.select({
      id: examResults.id,
      studentId: examResults.studentId,
      marks: examResults.marks,
      maxMarks: examResults.maxMarks,
      selectedForInterview: examResults.selectedForInterview,
      createdAt: examResults.createdAt,
      studentId2: students.id,
      applicationId: students.applicationId,
      name: students.name,
      age: students.age,
      dateOfBirth: students.dateOfBirth,
      gender: students.gender,
      fatherName: students.fatherName,
      fatherOccupation: students.fatherOccupation,
      motherName: students.motherName,
      mobile: students.mobile,
      phone: students.phone,
      aadhaarNumber: students.aadhaarNumber,
      village: students.village,
      district: students.district,
      state: students.state,
      address: students.address,
      previousSchool: students.previousSchool,
      classApplying: students.classApplying,
      photoUrl: students.photoUrl,
      centerId: students.centerId,
      coordinatorId: students.coordinatorId,
      admissionYear: students.admissionYear,
      status: students.status,
      examDate: students.examDate,
      examCenter: students.examCenter,
      declaration: students.declaration,
      studentCreatedAt: students.createdAt,
    })
    .from(examResults)
    .leftJoin(students, eq(examResults.studentId, students.id))
    .orderBy(desc(examResults.createdAt));
    
    const results = await query;
    
    return results
      .filter(r => r.studentId2 !== null)
      .map(r => ({
        id: r.id,
        studentId: r.studentId,
        marks: r.marks,
        maxMarks: r.maxMarks,
        selectedForInterview: r.selectedForInterview,
        createdAt: r.createdAt,
         student: {
           id: r.studentId2!,
           applicationId: r.applicationId!,
           name: r.name!,
           age: r.age!,
           dateOfBirth: r.dateOfBirth!,
           gender: r.gender!,
           fatherName: r.fatherName!,
           fatherOccupation: r.fatherOccupation!,
           motherName: r.motherName!,
           mobile: r.mobile!,
           phone: r.phone!,
           aadhaarNumber: r.aadhaarNumber!,
          village: r.village!,
          district: r.district!,
          state: r.state!,
          address: r.address!,
          previousSchool: r.previousSchool!,
          classApplying: r.classApplying!,
          photoUrl: r.photoUrl ?? null,
          centerId: r.centerId ?? null,
          coordinatorId: r.coordinatorId ?? null,
          admissionYear: r.admissionYear!,
          status: r.status!,
          examDate: r.examDate ?? null,
          examCenter: r.examCenter ?? null,
          declaration: r.declaration!,
          createdAt: r.studentCreatedAt!,
        },
      }))
      .filter(r => !admissionYear || r.student.admissionYear === admissionYear);
  }

  async getExamResultByStudentId(studentId: string): Promise<ExamResult | undefined> {
    const result = await db.select().from(examResults).where(eq(examResults.studentId, studentId)).limit(1);
    return result[0];
  }

  async createExamResult(data: InsertExamResult): Promise<ExamResult> {
    const id = randomUUID();
    const result = await db.insert(examResults).values({ ...data, id }).returning();
    return result[0];
  }

  async updateExamResult(id: string, data: Partial<ExamResult>): Promise<ExamResult> {
    const result = await db.update(examResults).set(data).where(eq(examResults.id, id)).returning();
    return result[0];
  }

  async getInterviewResults(admissionYear?: number): Promise<(InterviewResult & { student: Student })[]> {
    // Use JOIN to avoid N+1 queries
    const resultsRaw = await db.select({
      id: interviewResults.id,
      studentId: interviewResults.studentId,
      interviewMarks: interviewResults.interviewMarks,
      remarks: interviewResults.remarks,
      decision: interviewResults.decision,
      interviewedBy: interviewResults.interviewedBy,
      createdAt: interviewResults.createdAt,
      studentId2: students.id,
      applicationId: students.applicationId,
      name: students.name,
      age: students.age,
      dateOfBirth: students.dateOfBirth,
      gender: students.gender,
      fatherName: students.fatherName,
      fatherOccupation: students.fatherOccupation,
      motherName: students.motherName,
      mobile: students.mobile,
      phone: students.phone,
      aadhaarNumber: students.aadhaarNumber,
      village: students.village,
      district: students.district,
      state: students.state,
      address: students.address,
      previousSchool: students.previousSchool,
      classApplying: students.classApplying,
      photoUrl: students.photoUrl,
      centerId: students.centerId,
      coordinatorId: students.coordinatorId,
      admissionYear: students.admissionYear,
      status: students.status,
      examDate: students.examDate,
      examCenter: students.examCenter,
      declaration: students.declaration,
      studentCreatedAt: students.createdAt,
    })
    .from(interviewResults)
    .leftJoin(students, eq(interviewResults.studentId, students.id))
    .orderBy(desc(interviewResults.createdAt));
    
    return resultsRaw
      .filter(r => r.studentId2 !== null)
      .map(r => ({
        id: r.id,
        studentId: r.studentId,
        interviewMarks: r.interviewMarks,
        remarks: r.remarks ?? null,
        decision: r.decision,
        interviewedBy: r.interviewedBy ?? null,
        createdAt: r.createdAt,
         student: {
           id: r.studentId2!,
           applicationId: r.applicationId!,
           name: r.name!,
           age: r.age!,
           dateOfBirth: r.dateOfBirth!,
           gender: r.gender!,
           fatherName: r.fatherName!,
           fatherOccupation: r.fatherOccupation!,
           motherName: r.motherName!,
           mobile: r.mobile!,
           phone: r.phone!,
           aadhaarNumber: r.aadhaarNumber!,
          village: r.village!,
          district: r.district!,
          state: r.state!,
          address: r.address!,
          previousSchool: r.previousSchool!,
          classApplying: r.classApplying!,
          photoUrl: r.photoUrl ?? null,
          centerId: r.centerId ?? null,
          coordinatorId: r.coordinatorId ?? null,
          admissionYear: r.admissionYear!,
          status: r.status!,
          examDate: r.examDate ?? null,
          examCenter: r.examCenter ?? null,
          declaration: r.declaration!,
          createdAt: r.studentCreatedAt!,
        },
      }))
      .filter(r => !admissionYear || r.student.admissionYear === admissionYear);
  }

  async getInterviewResultByStudentId(studentId: string): Promise<InterviewResult | undefined> {
    const result = await db.select().from(interviewResults).where(eq(interviewResults.studentId, studentId)).limit(1);
    return result[0];
  }

  async createInterviewResult(data: InsertInterviewResult): Promise<InterviewResult> {
    const id = randomUUID();
    const result = await db.insert(interviewResults).values({ ...data, id }).returning();
    return result[0];
  }

  async updateInterviewResult(id: string, data: Partial<InterviewResult>): Promise<InterviewResult> {
    const result = await db.update(interviewResults).set(data).where(eq(interviewResults.id, id)).returning();
    return result[0];
  }

   async getDashboardStats(admissionYear?: number, coordinatorId?: string) {
     // Get all students without pagination for dashboard stats - use direct query
     const conditions = [];
     if (admissionYear) conditions.push(eq(students.admissionYear, admissionYear));
     if (coordinatorId) conditions.push(eq(students.coordinatorId, coordinatorId));
     
     const allStudents = conditions.length > 0
       ? await db.select().from(students).where(and(...conditions))
       : await db.select().from(students);
     
     const totalStudents = allStudents.length;
     const examCompleted = allStudents.filter(s =>
       ["exam_done", "selected_for_interview", "interview_done", "admitted", "waitlisted", "rejected"].includes(s.status)
     ).length;
     const interviewSelected = allStudents.filter(s =>
       ["selected_for_interview", "interview_done", "admitted", "waitlisted", "rejected"].includes(s.status)
     ).length;
     const finalAdmissions = allStudents.filter(s => s.status === "admitted").length;
 
     // Get centers for the admissionYear (if provided) to map centerId to name
     let centers: any[] = [];
     if (admissionYear !== undefined) {
       centers = await this.getCenters(admissionYear);
     } else {
       centers = await this.getCenters();
     }
     const centerMap = new Map<string, {
       name: string;
       total: number;
       admitted: number;
       waitlisted: number;
       rejected: number
     }>();
     centers.forEach(c => {
       centerMap.set(c.id, { name: c.name, total: 0, admitted: 0, waitlisted: 0, rejected: 0 });
     });
 
     // Count by center and status
     for (const s of allStudents) {
       if (s.centerId && centerMap.has(s.centerId)) {
         const centerData = centerMap.get(s.centerId)!;
         centerData.total++;
         if (s.status === "admitted") {
           centerData.admitted++;
         } else if (s.status === "waitlisted") {
           centerData.waitlisted++;
         } else if (s.status === "rejected") {
           centerData.rejected++;
         }
         // Note: we don't count other statuses in the detailed breakdown? We can if needed, but the table only shows total, admitted, waitlisted, rejected.
         // We'll leave it as is.
       }
     }
 
     const studentsByCenter = Array.from(centerMap.entries())
       .filter(([, data]) => data.total > 0) // only include centers with students
       .map(([id, data]) => ({ centerName: data.name, count: data.total }));
 
     const studentsByCenterDetail = Array.from(centerMap.entries())
       .filter(([, data]) => data.total > 0) // only include centers with students
       .map(([id, data]) => ({
         centerName: data.name,
         total: data.total,
         admitted: data.admitted,
         waitlisted: data.waitlisted,
         rejected: data.rejected,
       }));
 
     // State-wise statistics
     const stateMap = new Map<string, number>();
     for (const s of allStudents) {
       if (s.state) {
         const currentState = stateMap.get(s.state) || 0;
         stateMap.set(s.state, currentState + 1);
       }
     }
     const studentsByState = Array.from(stateMap.entries())
       .map(([state, count]) => ({ state, count }))
       .sort((a, b) => b.count - a.count); // Sort by count descending
 
     // Age-wise statistics
     const ageMap = new Map<string, number>();
     for (const s of allStudents) {
       if (s.age) {
         const ageGroup = s.age <= 10 ? '5-10' : s.age <= 15 ? '11-15' : s.age <= 20 ? '16-20' : '21-25';
         const currentCount = ageMap.get(ageGroup) || 0;
         ageMap.set(ageGroup, currentCount + 1);
       }
     }
     const studentsByAge = Array.from(ageMap.entries())
       .map(([ageGroup, count]) => ({ ageGroup, count }))
       .sort((a, b) => {
         const order = ['5-10', '11-15', '16-20', '21-25'];
         return order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup);
       });
 
     // Get coordinators to map coordinatorId to name and center
     const coordinators = await this.getCoordinators();
     const coordinatorMap = new Map<string, { name: string; centerId: string | null }>();
     coordinators.forEach(c => {
       coordinatorMap.set(c.id, { name: c.name, centerId: c.centerId });
     });
 
     // Count by coordinator
     const coordinatorCountMap = new Map<string, number>();
     for (const s of allStudents) {
       if (s.coordinatorId) {
         const count = coordinatorCountMap.get(s.coordinatorId) || 0;
         coordinatorCountMap.set(s.coordinatorId, count + 1);
       }
     }
 
     const studentsByCoordinator = Array.from(coordinatorCountMap.entries())
       .map(([coordId, count]) => {
         const coord = coordinatorMap.get(coordId);
         const centerName = coord?.centerId ? centerMap.get(coord.centerId)?.name || "Unknown" : "Unknown";
         return {
           coordinatorName: coord?.name || "Unknown",
           center: centerName,
           count
         };
       })
       .filter(item => item.count > 0);
 
      return {
        totalStudents,
        examCompleted,
        interviewSelected,
        finalAdmissions,
        studentsByCenter,
        studentsByCenterDetail,
        studentsByState,
        studentsByAge,
        studentsByCoordinator
      };
    }

    async getAdminDashboardStats(admissionYear?: number) {
      // Get all students without pagination for dashboard stats - use direct query
      const conditions = [];
      if (admissionYear) conditions.push(eq(students.admissionYear, admissionYear));
      
      const allStudents = conditions.length > 0 
        ? await db.select().from(students).where(and(...conditions))
        : await db.select().from(students);
      
      const totalStudents = allStudents.length;
      const examCompleted = allStudents.filter(s =>
        ["exam_done", "selected_for_interview", "interview_done", "admitted", "waitlisted", "rejected"].includes(s.status)
      ).length;
      const interviewSelected = allStudents.filter(s =>
        ["selected_for_interview", "interview_done", "admitted", "waitlisted", "rejected"].includes(s.status)
      ).length;
      const finalAdmissions = allStudents.filter(s => s.status === "admitted").length;

      // Get centers for the admissionYear (if provided) to map centerId to name
      let centers: any[] = [];
      if (admissionYear !== undefined) {
        centers = await this.getCenters(admissionYear);
      } else {
        centers = await this.getCenters();
      }
      const centerMap = new Map<string, { 
        name: string; 
        total: number; 
        admitted: number; 
        waitlisted: number; 
        rejected: number 
      }>();
      centers.forEach(c => {
        centerMap.set(c.id, { name: c.name, total: 0, admitted: 0, waitlisted: 0, rejected: 0 });
      });

      // Count by center and status
      for (const s of allStudents) {
        if (s.centerId && centerMap.has(s.centerId)) {
          const centerData = centerMap.get(s.centerId)!;
          centerData.total++;
          if (s.status === "admitted") {
            centerData.admitted++;
          } else if (s.status === "waitlisted") {
            centerData.waitlisted++;
          } else if (s.status === "rejected") {
            centerData.rejected++;
          }
          // Note: we don't count other statuses in the detailed breakdown? We can if needed, but the table only shows total, admitted, waitlisted, rejected.
          // We'll leave it as is.
        }
      }

      const centersResult = Array.from(centerMap.entries())
        .filter(([, data]) => data.total > 0) // only include centers with students
        .map(([id, data]) => ({
          centerName: data.name,
          total: data.total,
          admitted: data.admitted,
          waitlisted: data.waitlisted,
          rejected: data.rejected,
        }));

      // State-wise statistics
      const stateMap = new Map<string, number>();
      for (const s of allStudents) {
        if (s.state) {
          const currentState = stateMap.get(s.state) || 0;
          stateMap.set(s.state, currentState + 1);
        }
      }
      const studentsByState = Array.from(stateMap.entries())
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      // Age-wise statistics
      const ageMap = new Map<string, number>();
      for (const s of allStudents) {
        if (s.age) {
          const ageGroup = s.age <= 10 ? '5-10' : s.age <= 15 ? '11-15' : s.age <= 20 ? '16-20' : '21-25';
          const currentCount = ageMap.get(ageGroup) || 0;
          ageMap.set(ageGroup, currentCount + 1);
        }
      }
      const studentsByAge = Array.from(ageMap.entries())
        .map(([ageGroup, count]) => ({ ageGroup, count }))
        .sort((a, b) => {
          const order = ['5-10', '11-15', '16-20', '21-25'];
          return order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup);
        });

      return { 
        totalStudents, 
        examCompleted, 
        interviewSelected, 
        finalAdmissions, 
        centers: centersResult,
        studentsByState,
        studentsByAge
      };
    }

  async generateApplicationId(admissionYear: number): Promise<string> {
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(students)
      .where(eq(students.admissionYear, admissionYear));
    const num = (Number(count[0].count) + 1).toString().padStart(4, "0");
    return `SKN-${admissionYear}-${num}`;
  }
}

export const storage = new DatabaseStorage();
