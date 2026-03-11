import mongoose from "mongoose";

const bloodRequestSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  bloodGroup: { 
    type: String, 
    required: true,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  },
  unitsRequired: { type: Number, required: true },
  hospitalName: { type: String, required: true },
  requiredTime: { type: Date, required: true },
  contactPerson: { type: String, required: true },
  contactPhone: { type: String, required: true },
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  city: { type: String, required: true },
  status: { type: String, enum: ["open", "fulfilled", "closed"], default: "open" },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

bloodRequestSchema.index({ location: "2dsphere" });

export const BloodRequest = mongoose.model("BloodRequest", bloodRequestSchema);
