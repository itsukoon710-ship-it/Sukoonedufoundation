import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema.js";

// Get database URL and configure SSL properly
function getPoolConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  // Add sslmode=require if not already present
  let connectionString = dbUrl;
  if (!dbUrl.includes("sslmode")) {
    const separator = dbUrl.includes("?") ? "&" : "?";
    connectionString = `${dbUrl}${separator}sslmode=require`;
  }
  
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
}

const pool = new Pool(getPoolConfig());

export { pool };
export const db = drizzle(pool, { schema });
