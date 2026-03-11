import { User } from "../models/User";
import admin from "firebase-admin";

// Initialize Firebase Admin (Mocked for preview if credentials are not provided)
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT not found. Push notifications will be mocked.");
  }
} catch (e) {
  console.error("Firebase admin init failed:", e);
}

export const matchAndNotify = async (request: any) => {
  try {
    const { bloodGroup, location, city } = request;
    const [lng, lat] = location.coordinates;

    // 120 days ago
    const eligibleDate = new Date();
    eligibleDate.setDate(eligibleDate.getDate() - 120);

    // Find eligible donors
    const donors = await User.find({
      bloodGroup,
      role: "donor",
      $or: [
        { lastDonationDate: { $lt: eligibleDate } },
        { lastDonationDate: null }
      ],
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: 50000 // 50km radius
        }
      }
    });

    console.log(`Found ${donors.length} eligible donors for request ${request._id}`);

    // Send Notifications
    const tokens = donors.map(d => d.fcmToken).filter(Boolean);
    
    if (tokens.length > 0 && admin.apps.length > 0) {
      const message = {
        notification: {
          title: "Urgent Blood Request!",
          body: `A patient needs ${bloodGroup} blood in ${city}. Can you help?`
        },
        tokens: tokens as string[]
      };
      
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(response.successCount + ' messages were sent successfully');
    } else {
      console.log(`Mocking notifications to ${donors.length} donors.`);
    }

    // Mock Email sending
    donors.forEach(donor => {
      console.log(`[MOCK EMAIL] Sent to ${donor.email}: Urgent ${bloodGroup} needed at ${request.hospitalName}`);
    });

  } catch (error) {
    console.error("Error in matchAndNotify:", error);
  }
};
