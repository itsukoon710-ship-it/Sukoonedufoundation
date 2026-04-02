import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema.js";

// Get database URL and add sslmode=require if not already present
function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  // Add sslmode=require if not already in the connection string
  if (!dbUrl.includes("sslmode")) {
    const separator = dbUrl.includes("?") ? "&" : "?";
    return `${dbUrl}${separator}sslmode=require`;
  }
  
  return dbUrl;
}

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: { rejectUnauthorized: false },
});

export { pool };
export const db = drizzle(pool, { schema });
