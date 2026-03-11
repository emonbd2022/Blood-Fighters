import { VercelRequest, VercelResponse } from "@vercel/node";
import { connectDB } from "../server/db";
import app from "../server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure DB is connected before handling the request
  await connectDB();
  
  // Delegate to the Express app
  return app(req as any, res as any);
}
