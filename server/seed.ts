
import { storage } from "./storage.js";
import { db } from "./db.js";
import { users, centers, students, admissionYears, examResults, interviewResults, subjects, studentSubjectMarks } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("Admin user already exists, skipping seed.");
      return;
    }

    console.log("Seeding database...");

    // Create admin user only
    await storage.createUser({
      username: "admin",
      password: "admin123",
      name: "Admin User",
      role: "admin",
      centerId: null,
      admissionYear: 2026,
    });

    console.log("Database seeded successfully!");
  } catch (error: any) {
    console.error("Seeding error:", error);
    // Don't throw error if it's related to marks_entry_permission column
    // The storage layer should handle this gracefully
    if (error.message && error.message.includes('marks_entry_permission')) {
      console.log("Warning: marks_entry_permission column issue detected, but continuing...");
    } else {
      throw error;
    }
  }
}
