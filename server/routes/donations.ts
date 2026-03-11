import express from "express";
import multer from "multer";
import { Donation } from "../models/Donation.js";
import { auth, AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { uploadImage } from "../services/cloudinary.js";
import { generatePoster } from "../services/poster.js";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = process.env.VERCEL ? path.join(os.tmpdir(), "uploads") : path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir }); // Temporary local storage before Cloudinary

router.post("/", auth, async (req: AuthRequest, res) => {
  try {
    const { requestId, donationDate } = req.body;

    const donation = new Donation({
      donorId: req.user?.id,
      requestId: requestId || null,
      donationDate
    });

    await donation.save();

    // Update user's last donation date
    await User.findByIdAndUpdate(req.user?.id, { lastDonationDate: donationDate });

    res.status(201).json(donation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", auth, async (req: AuthRequest, res) => {
  try {
    const donations = await Donation.find({ donorId: req.user?.id }).sort({ donationDate: -1 }).populate("requestId");
    res.json(donations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Upload proof and generate poster
router.post("/:id/proof", auth, upload.single("proof"), async (req: AuthRequest, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: "Donation not found" });

    if (donation.donorId.toString() !== req.user?.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No proof image uploaded" });
    }

    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Upload proof to Cloudinary
    let proofUrl = "";
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      proofUrl = await uploadImage(req.file.path, "blood-fighters/proofs");
    } else {
      console.warn("Cloudinary not configured. Skipping proof upload.");
      proofUrl = "mock_proof_url";
    }

    // 2. Generate Poster via Puppeteer
    let posterUrl = "";
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      posterUrl = await generatePoster(user.name, user.bloodGroup, donation.donationDate);
    } else {
      console.warn("Cloudinary not configured. Skipping poster generation.");
      posterUrl = "mock_poster_url";
    }

    // 3. Update donation record
    donation.proofImageUrl = proofUrl;
    donation.posterUrl = posterUrl;
    donation.status = "verified";
    await donation.save();

    res.json(donation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
