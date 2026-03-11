import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./server/db.js";
import authRoutes from "./server/routes/auth.js";
import requestRoutes from "./server/routes/requests.js";
import donationRoutes from "./server/routes/donations.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Connect to MongoDB
  await connectDB();

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/requests", requestRoutes);
  app.use("/api/donations", donationRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      dbState: mongoose.connection.readyState,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const viteModule = "vite";
    const { createServer: createViteServer } = await import(viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

// Export for Vercel Serverless
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/donations", donationRoutes);
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hasMongoUri: !!process.env.MONGODB_URI,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

export default app;
