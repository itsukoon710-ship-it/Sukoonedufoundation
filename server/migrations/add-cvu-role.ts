import { sql } from "drizzle-orm";

export async function up(db) {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cvu' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'cvu';
      END IF;
    END $$;
  `);
}

export async function down(db) {
  // Note: PostgreSQL doesn't allow removing enum values easily
  // In practice, you would need to recreate the type or ignore the value
  console.log("Cannot easily remove enum value 'cvu' from user_role. Manual intervention may be required.");
}