import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "coordinator", "examiner"]);
export const genderEnum = pgEnum("gender", ["Male", "Female", "Other"]);
export const studentStatusEnum = pgEnum("student_status", [
  "registered",
  "exam_scheduled",
  "exam_done",
  "selected_for_interview",
  "interview_done",
  "admitted",
  "waitlisted",
  "rejected"
]);
export const interviewDecisionEnum = pgEnum("interview_decision", ["selected", "waitlisted", "rejected"]);
export const selectionModeEnum = pgEnum("selection_mode", ["all_pass", "min_subjects", "total_marks"]);

export const admissionYears = pgTable("admission_years", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  year: integer("year").notNull().unique(),
  cutoffMarks: integer("cutoff_marks").notNull().default(40),
  isActive: boolean("is_active").notNull().default(true),
  selectionMode: selectionModeEnum("selection_mode").notNull().default("all_pass"),
  minSubjectsToPass: integer("min_subjects_to_pass").notNull().default(3),
  totalCutoffMarks: integer("total_cutoff_marks").notNull().default(120),
  resultsPublished: boolean("results_published").notNull().default(false),
  publicRegistrationEnabled: boolean("public_registration_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const centers = pgTable("centers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
  admissionYear: integer("admission_year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("coordinator"),
  centerId: varchar("center_id").references(() => centers.id),
  admissionYear: integer("admission_year").notNull().default(2026),
  marksEntryPermission: boolean("marks_entry_permission").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  admissionYear: integer("admission_year").notNull().default(2026),
  name: text("name").notNull(),
  code: text("code").notNull(),
  maxMarks: integer("max_marks").notNull().default(100),
  passingMarks: integer("passing_marks").notNull().default(33),
  isActive: boolean("is_active").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: text("application_id").notNull().unique(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: genderEnum("gender").notNull(),
  fatherName: text("father_name").notNull(),
  fatherOccupation: text("father_occupation").notNull(),
  motherName: text("mother_name").notNull(),
  mobile: text("mobile").notNull(),
  phone: text("phone"),
  aadhaarNumber: text("aadhaar_number").notNull(),
  village: text("village").notNull(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  address: text("address").notNull(),
  previousSchool: text("previous_school").notNull(),
  classApplying: text("class_applying").notNull(),
  photoUrl: text("photo_url"),
  centerId: varchar("center_id").references(() => centers.id),
  coordinatorId: varchar("coordinator_id").references(() => users.id),
  admissionYear: integer("admission_year").notNull().default(2026),
  status: studentStatusEnum("status").notNull().default("registered"),
  examDate: text("exam_date"),
  examCenter: text("exam_center"),
  declaration: boolean("declaration").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    admissionYearIdx: index("idx_students_admission_year").on(table.admissionYear),
    statusIdx: index("idx_students_status").on(table.status),
    centerIdIdx: index("idx_students_center_id").on(table.centerId),
    coordinatorIdIdx: index("idx_students_coordinator_id").on(table.coordinatorId),
  };
});

export const studentSubjectMarks = pgTable("student_subject_marks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  subjectId: varchar("subject_id").references(() => subjects.id).notNull(),
  marks: integer("marks").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    studentIdIdx: index("idx_student_subject_marks_student_id").on(table.studentId),
    subjectIdIdx: index("idx_student_subject_marks_subject_id").on(table.subjectId),
  };
});

export const examResults = pgTable("exam_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  marks: integer("marks").notNull(),
  maxMarks: integer("max_marks").notNull().default(100),
  selectedForInterview: boolean("selected_for_interview").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    studentIdIdx: index("idx_exam_results_student_id").on(table.studentId),
  };
});

export const interviewResults = pgTable("interview_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  interviewMarks: integer("interview_marks").notNull(),
  remarks: text("remarks"),
  decision: interviewDecisionEnum("decision").notNull(),
  interviewedBy: varchar("interviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    studentIdIdx: index("idx_interview_results_student_id").on(table.studentId),
  };
});

// Insert schemas
export const insertAdmissionYearSchema = createInsertSchema(admissionYears).omit({ id: true, createdAt: true });
export const insertCenterSchema = createInsertSchema(centers).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertSubjectSchema = createInsertSchema(subjects).omit({ id: true, createdAt: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true, applicationId: true, createdAt: true, status: true });
export const insertStudentSubjectMarksSchema = createInsertSchema(studentSubjectMarks).omit({ id: true, createdAt: true });
export const insertExamResultSchema = createInsertSchema(examResults).omit({ id: true, createdAt: true, selectedForInterview: true });
export const insertInterviewResultSchema = createInsertSchema(interviewResults).omit({ id: true, createdAt: true });

// Types
export type AdmissionYear = typeof admissionYears.$inferSelect;
export type InsertAdmissionYear = z.infer<typeof insertAdmissionYearSchema>;
export type Center = typeof centers.$inferSelect;
export type InsertCenter = z.infer<typeof insertCenterSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type StudentSubjectMarks = typeof studentSubjectMarks.$inferSelect;
export type InsertStudentSubjectMarks = z.infer<typeof insertStudentSubjectMarksSchema>;
export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = z.infer<typeof insertExamResultSchema>;
export type InterviewResult = typeof interviewResults.$inferSelect;
export type InsertInterviewResult = z.infer<typeof insertInterviewResultSchema>;
