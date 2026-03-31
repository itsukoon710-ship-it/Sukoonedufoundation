import { sql } from "drizzle-orm";
import { db } from "../db";

export async function addResultsPublishedColumn() {
  try {
    console.log("Adding results_published column to admission_years table...");
    
    // Check if column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admission_years' 
      AND column_name = 'results_published'
    `);
    
    if (checkColumn.rows.length === 0) {
      // Add the column
      await db.execute(sql`
        ALTER TABLE admission_years 
        ADD COLUMN results_published BOOLEAN NOT NULL DEFAULT false
      `);
      console.log("Successfully added results_published column");
    } else {
      console.log("Column results_published already exists");
    }
  } catch (error) {
    console.error("Error adding results_published column:", error);
    throw error;
  }
}
