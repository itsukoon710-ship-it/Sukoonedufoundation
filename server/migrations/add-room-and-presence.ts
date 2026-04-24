import { sql } from "drizzle-orm";
import { text, boolean } from "drizzle-orm/pg-core";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export async function up(db) {
  await db.execute(sql`
    ALTER TABLE students 
    ADD COLUMN IF NOT EXISTS room_number TEXT,
    ADD COLUMN IF NOT EXISTS is_present BOOLEAN NOT NULL DEFAULT FALSE
  `);
}

export async function down(db) {
  await db.execute(sql`
    ALTER TABLE students 
    DROP COLUMN IF EXISTS room_number,
    DROP COLUMN IF EXISTS is_present
  `);
}