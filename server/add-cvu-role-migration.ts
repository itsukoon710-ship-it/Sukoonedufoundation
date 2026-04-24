import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function addCvuRoleToEnum() {
  console.log("Adding 'cvu' to user_role enum...");
  
  try {
    // Check if 'cvu' is already in the enum
    const enumResult = await db.execute(sql`
      SELECT enumtypid::regtype AS enum_type, enumlabel
      FROM pg_enum
      WHERE enumtypid = 'user_role'::regtype
      ORDER BY enumsortorder
    `);

    const existingValues = enumResult.rows.map(row => row.enumlabel);
    console.log("Current user_role enum values:", existingValues);

    if (!existingValues.includes('cvu')) {
      console.log("Adding 'cvu' to user_role enum...");
      await db.execute(sql`ALTER TYPE user_role ADD VALUE 'cvu'`);
      console.log("✓ Successfully added 'cvu' to user_role enum");
    } else {
      console.log("✓ 'cvu' already exists in user_role enum");
    }
  } catch (error: any) {
    console.log("Note: Could not check/add enum value (may already exist):", error.message);
  }
}

// Run if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  addCvuRoleToEnum().then(() => {
    console.log("\nMigration script finished.");
    process.exit(0);
  }).catch((error) => {
    console.error("\nMigration script failed:", error);
    process.exit(1);
  });
}