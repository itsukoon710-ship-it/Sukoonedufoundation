import type { Request, Response } from "express";
import app from "../server/index.js";

// Export the app directly for Vercel serverless functions
// Database initialization is handled by the server module
export default async function handler(req: Request, res: Response) {
  return app(req, res);
}
