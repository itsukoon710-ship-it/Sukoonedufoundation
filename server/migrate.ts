import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function runMigrations() {
  console.log("Running database migrations...");
  
  try {
    // Migration 1: Add marks_entry_permission column if it doesn't exist
    console.log("\n=== Migration 1: Adding marks_entry_permission column ===");
    
    const tableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `);
    
    if (tableResult.rows.length === 0) {
      console.log("Users table does not exist. Please run db:push first.");
      return;
    }
    
    const columnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'marks_entry_permission'
    `);
    
    if (columnResult.rows.length === 0) {
      console.log("Adding marks_entry_permission column...");
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN marks_entry_permission BOOLEAN NOT NULL DEFAULT false
      `);
      console.log("✓ Successfully added marks_entry_permission column");
    } else {
      console.log("✓ marks_entry_permission column already exists");
    }
    
    // Migration 2: Fix unhashed passwords
    console.log("\n=== Migration 2: Fixing unhashed passwords ===");
    
    const usersResult = await db.execute(sql`SELECT id, username, password FROM users`);
    console.log(`Found ${usersResult.rows.length} users`);
    
    let fixedCount = 0;
    for (const user of usersResult.rows) {
      const isHashed = (user.password as string).startsWith('$2b$') || (user.password as string).startsWith('$2a$');
      
      if (!isHashed) {
        console.log(`Fixing password for user: ${user.username}`);
        const hashedPassword = await bcrypt.hash(user.password as string, SALT_ROUNDS);
        await db.execute(sql`
          UPDATE users 
          SET password = ${hashedPassword} 
          WHERE id = ${user.id}
        `);
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      console.log(`✓ Fixed ${fixedCount} users with unhashed passwords`);
    } else {
      console.log("✓ All passwords are already hashed");
    }
    
    // Migration 3: Add missing columns to students table
    console.log("\n=== Migration 3: Adding missing columns to students table ===");
    
    const studentsTableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'students'
    `);
    
    if (studentsTableResult.rows.length === 0) {
      console.log("Students table does not exist. Please run db:push first.");
      return;
    }
    
    // Define all columns that should exist in students table
    const requiredColumns = [
      { name: 'age', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'father_occupation', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'mobile', type: "TEXT NOT NULL DEFAULT ''" },
      { name: 'phone', type: 'TEXT' },
      { name: 'aadhaar_number', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'village', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'district', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'state', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'address', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'previous_school', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'class_applying', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'photo_url', type: 'TEXT' },
      { name: 'center_id', type: 'VARCHAR' },
      { name: 'coordinator_id', type: 'VARCHAR' },
      { name: 'admission_year', type: 'INTEGER NOT NULL DEFAULT 2026' },
      { name: 'status', type: 'TEXT NOT NULL DEFAULT \'registered\'' },
      { name: 'exam_date', type: 'TEXT' },
      { name: 'exam_center', type: 'TEXT' },
      { name: 'declaration', type: 'BOOLEAN NOT NULL DEFAULT false' },
    ];
    
    for (const column of requiredColumns) {
      const columnResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name = ${column.name}
      `);
      
      if (columnResult.rows.length === 0) {
        console.log(`Adding ${column.name} column to students table...`);
        await db.execute(sql.raw(`
          ALTER TABLE students 
          ADD COLUMN ${column.name} ${column.type}
        `));
        console.log(`✓ Successfully added ${column.name} column to students table`);
      } else {
        console.log(`✓ ${column.name} column already exists in students table`);
      }
    }
    
    // Migration 4: Add 'examiner' to user_role enum if not exists
    console.log("\n=== Migration 4: Adding 'examiner' to user_role enum ===");

    try {
      // Check if 'examiner' is already in the enum
      const enumResult = await db.execute(sql`
        SELECT enumtypid::regtype AS enum_type, enumlabel
        FROM pg_enum
        WHERE enumtypid = 'user_role'::regtype
        ORDER BY enumsortorder
      `);

      const existingValues = enumResult.rows.map(row => row.enumlabel);
      console.log("Current user_role enum values:", existingValues);

      if (!existingValues.includes('examiner')) {
        console.log("Adding 'examiner' to user_role enum...");
        await db.execute(sql`ALTER TYPE user_role ADD VALUE 'examiner'`);
        console.log("✓ Successfully added 'examiner' to user_role enum");
      } else {
        console.log("✓ 'examiner' already exists in user_role enum");
      }
    } catch (error: any) {
      console.log("Note: Could not check/add enum value (may already exist):", error.message);
    }

    // Migration 5: Add results_published column to admission_years table
    console.log("\n=== Migration 5: Adding results_published column to admission_years ===");
    
    const admissionYearsTableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'admission_years'
    `);
    
    if (admissionYearsTableResult.rows.length === 0) {
      console.log("Admission years table does not exist. Please run db:push first.");
      return;
    }
    
    const resultsPublishedColumnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admission_years' 
      AND column_name = 'results_published'
    `);
    
    if (resultsPublishedColumnResult.rows.length === 0) {
      console.log("Adding results_published column...");
      await db.execute(sql`
        ALTER TABLE admission_years 
        ADD COLUMN results_published BOOLEAN NOT NULL DEFAULT false
      `);
      console.log("✓ Successfully added results_published column");
    } else {
      console.log("✓ results_published column already exists");
    }

    // Migration 6: Add public_registration_enabled column to admission_years table
    console.log("\n=== Migration 6: Adding public_registration_enabled column to admission_years ===");

    const publicRegColumnResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'admission_years'
      AND column_name = 'public_registration_enabled'
    `);

    if (publicRegColumnResult.rows.length === 0) {
      console.log("Adding public_registration_enabled column...");
      await db.execute(sql`
        ALTER TABLE admission_years
        ADD COLUMN public_registration_enabled BOOLEAN NOT NULL DEFAULT true
      `);
      console.log("✓ Successfully added public_registration_enabled column");
    } else {
      console.log("✓ public_registration_enabled column already exists");
    }

    console.log("\n=== All migrations completed successfully! ===");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMigrations().then(() => {
    console.log("\nMigration script finished.");
    process.exit(0);
  }).catch((error) => {
    console.error("\nMigration script failed:", error);
    process.exit(1);
  });
}
