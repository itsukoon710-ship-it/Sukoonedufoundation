import { sql } from "drizzle-orm";
import { db } from "../db.js";

export async function addTopStudentsToSelectionModeEnum() {
  try {
    console.log("Adding 'top_students' to selection_mode enum...");

    // Check if the enum value already exists
    const checkEnum = await db.execute(sql`
      SELECT enumtypid::regtype
      FROM pg_enum
      WHERE enumtypid = 'selection_mode'::regtype
      AND enumlabel = 'top_students'
    `);

    if (checkEnum.rows.length === 0) {
      // Add the enum value
      await db.execute(sql`
        ALTER TYPE selection_mode ADD VALUE 'top_students'
      `);
      console.log("Successfully added 'top_students' to selection_mode enum");
    } else {
      console.log("Enum value 'top_students' already exists");
    }
  } catch (error) {
    console.error("Error adding 'top_students' to selection_mode enum:", error);
    throw error;
  }
}