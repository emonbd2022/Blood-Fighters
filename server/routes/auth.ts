import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import admin from "firebase-admin";
import { User } from "../models/User.js";
import { auth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: "Database connection failed. Please check MongoDB IP Whitelist (allow 0.0.0.0/0)." });
    }

    const { name, email, password, phone, bloodGroup, lat, lng } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      bloodGroup,
      location: {
        type: "Point",
        coordinates: [lng, lat]
      }
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, bloodGroup: user.bloodGroup }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: "Database connection failed. Please check MongoDB IP Whitelist (allow 0.0.0.0/0)." });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, bloodGroup: user.bloodGroup }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: "Database connection failed." });
    }

    const { token, email, name, uid } = req.body;
    
    let verifiedEmail = email;
    
    // Verify token if admin is initialized
    if (admin.apps.length > 0 && token) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        verifiedEmail = decodedToken.email;
      } catch (e) {
        console.warn("Firebase token verification failed, falling back to provided email", e);
      }
    }

    const user = await User.findOne({ email: verifiedEmail });
    if (!user) {
      return res.status(400).json({ message: "User not found. Please register first.", requireMoreInfo: true });
    }

    const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });

    res.json({
      token: jwtToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, bloodGroup: user.bloodGroup }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", auth, async (req: AuthRequest, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: "Database connection failed." });
    }
    const user = await User.findById(req.user?.id).select("-password");
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
