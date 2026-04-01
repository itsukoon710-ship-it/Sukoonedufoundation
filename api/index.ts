import type { Request, Response } from "express";
import app from "../server/index.js";
import { runMigrations } from "../server/migrate.js";
import { seedDatabase } from "../server/seed.js";

// Ensure database is ready before handling requests
let isInitialized = false;

async function initializeApp() {
  if (!isInitialized) {
    try {
      await runMigrations();
      await seedDatabase();
      isInitialized = true;
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Database initialization failed:", error);
      // Continue anyway to avoid complete failure
    }
  }
  return app;
}

export default async function handler(req: Request, res: Response) {
  const initializedApp = await initializeApp();
  return initializedApp(req, res);
}