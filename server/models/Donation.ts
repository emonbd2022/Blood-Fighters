import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: "BloodRequest" },
  proofImageUrl: { type: String },
  posterUrl: { type: String },
  status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  donationDate: { type: Date, required: true }
}, { timestamps: true });

export const Donation = mongoose.model("Donation", donationSchema);
