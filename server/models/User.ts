import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  bloodGroup: { 
    type: String, 
    required: true,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  },
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  lastDonationDate: { type: Date },
  fcmToken: { type: String },
  role: { type: String, enum: ["donor", "admin"], default: "donor" }
}, { timestamps: true });

userSchema.index({ location: "2dsphere" });

export const User = mongoose.model("User", userSchema);
