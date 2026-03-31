import { sql } from "drizzle-orm";
import { db } from "../db";

export async function addPublicRegistrationEnabledColumn() {
  try {
    console.log("Adding public_registration_enabled column to admission_years table...");

    // Check if column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'admission_years'
      AND column_name = 'public_registration_enabled'
    `);

    if (checkColumn.rows.length === 0) {
      // Add the column
      await db.execute(sql`
        ALTER TABLE admission_years
        ADD COLUMN public_registration_enabled BOOLEAN NOT NULL DEFAULT true
      `);
      console.log("Successfully added public_registration_enabled column");
    } else {
      console.log("Column public_registration_enabled already exists");
    }
  } catch (error) {
    console.error("Error adding public_registration_enabled column:", error);
    throw error;
  }
}