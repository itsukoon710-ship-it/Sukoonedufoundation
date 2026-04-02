import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function addMarksPermissionColumn() {
  console.log("Checking if marks_entry_permission column exists...");
  
  try {
    // Check if users table exists
    const tableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `);
    
    if (tableResult.rows.length === 0) {
      console.log("Users table does not exist. Please run db:push first.");
      return;
    }
    
    // Check if column exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'marks_entry_permission'
    `);
    
    if (result.rows.length === 0) {
      console.log("Column marks_entry_permission does not exist. Adding it...");
      
      // Add the column
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN marks_entry_permission BOOLEAN NOT NULL DEFAULT false
      `);
      
      console.log("Successfully added marks_entry_permission column");
    } else {
      console.log("Column marks_entry_permission already exists");
    }
  } catch (error) {
    console.error("Error adding marks_entry_permission column:", error);
    throw error;
  }
}

// Run if this file is executed directly
addMarksPermissionColumn().then(() => {
  console.log("Migration complete!");
  process.exit(0);
}).catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
