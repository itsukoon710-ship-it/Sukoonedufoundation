import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema.js";

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Add sslmode=require to connection string if not already present
let connectionString = databaseUrl;
if (!databaseUrl.includes("sslmode")) {
  const separator = databaseUrl.includes("?") ? "&" : "?";
  connectionString = `${databaseUrl}${separator}sslmode=require`;
}

// Create pool with SSL configuration
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

export { pool };
export const db = drizzle(pool, { schema });
