import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function applyRoomAndPresenceMigration() {
  console.log("Applying room_number and is_present columns migration...");
  
  try {
    await db.execute(sql`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS room_number TEXT,
      ADD COLUMN IF NOT EXISTS is_present BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("✓ Successfully added room_number and is_present columns");
  } catch (error) {
    console.error("Error applying migration:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  applyRoomAndPresenceMigration().then(() => {
    console.log("\nMigration script finished.");
    process.exit(0);
  }).catch((error) => {
    console.error("\nMigration script failed:", error);
    process.exit(1);
  });
}