import express from "express";
import { BloodRequest } from "../models/BloodRequest";
import { auth, AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { matchAndNotify } from "../services/notifications";

const router = express.Router();

router.post("/", auth, async (req: AuthRequest, res) => {
  try {
    const { patientName, bloodGroup, unitsRequired, hospitalName, requiredTime, contactPerson, contactPhone, lat, lng, city } = req.body;

    const newRequest = new BloodRequest({
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      requiredTime,
      contactPerson,
      contactPhone,
      location: {
        type: "Point",
        coordinates: [lng, lat]
      },
      city,
      requesterId: req.user?.id
    });

    await newRequest.save();

    // Trigger matching & notification flow
    matchAndNotify(newRequest);

    res.status(201).json(newRequest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { bloodGroup, city, lat, lng, radius } = req.query;
    let query: any = { status: "open" };

    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (city) query.city = { $regex: new RegExp(city as string, "i") };

    if (lat && lng && radius) {
      query.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
          },
          $maxDistance: parseInt(radius as string) * 1000 // radius in km
        }
      };
    }

    const requests = await BloodRequest.find(query).sort({ createdAt: -1 }).populate("requesterId", "name phone");
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/status", auth, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const request = await BloodRequest.findById(req.params.id);

    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.requesterId.toString() !== req.user?.id && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = status;
    await request.save();

    res.json(request);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
