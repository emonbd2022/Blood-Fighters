import mongoose from "mongoose";

// Global caching for Vercel Serverless environments
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn("MONGODB_URI is not defined. Skipping database connection for preview.");
      return null;
    }
    cached.promise = mongoose.connect(uri).then((mongoose) => {
      console.log("MongoDB connected");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("MongoDB connection error:", error);
    console.error("Ensure your IP address is whitelisted in MongoDB Atlas (0.0.0.0/0 for all IPs).");
    // Do not exit process, so the frontend can still load and show errors
  }

  return cached.conn;
};
