import { sql } from "drizzle-orm";
import { db } from "../db.js";

export async function addNumberOfStudentsToSelectColumn() {
  try {
    console.log("Adding number_of_students_to_select column to admission_years table...");

    // Check if column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'admission_years'
      AND column_name = 'number_of_students_to_select'
    `);

    if (checkColumn.rows.length === 0) {
      // Add the column
      await db.execute(sql`
        ALTER TABLE admission_years
        ADD COLUMN number_of_students_to_select INTEGER
      `);
      console.log("Successfully added number_of_students_to_select column");
    } else {
      console.log("Column number_of_students_to_select already exists");
    }
  } catch (error) {
    console.error("Error adding number_of_students_to_select column:", error);
    throw error;
  }
}