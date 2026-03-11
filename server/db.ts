import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn("MONGODB_URI is not defined. Skipping database connection for preview.");
      return;
    }
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.error("Ensure your IP address is whitelisted in MongoDB Atlas (0.0.0.0/0 for all IPs).");
    // Do not exit process, so the frontend can still load and show errors
  }
};
