import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema.js";

// Get database URL and configure SSL properly
function getPoolConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  // Check if running in production (Vercel)
  const isProduction = process.env.NODE_ENV === "production";
  
  return {
    connectionString: dbUrl,
    ssl: isProduction ? true : { rejectUnauthorized: false },
  };
}

const pool = new Pool(getPoolConfig());

export { pool };
export const db = drizzle(pool, { schema });
