# Blood Fighters

A full-stack MVP for blood donation matching, requests, and donor management.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Storage**: Cloudinary (for proof images and generated posters)
- **PDF/Image Gen**: Puppeteer (HTML to Image)
- **Notifications**: Firebase Cloud Messaging (FCM)

## Environment Variables
Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/bloodfighters
JWT_SECRET=your_super_secret_jwt_key
PORT=3000

# Cloudinary (Required for image upload & poster generation)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase Admin (Required for FCM Push Notifications)
# Stringified JSON of your service account key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (Full-stack Express + Vite):
   ```bash
   npm run dev
   ```

## Deployment

### Frontend (Vercel)
1. Set the build command to `npm run build`
2. Set the output directory to `dist`
3. Add environment variables (VITE_APP_URL if needed)

### Backend (Render)
1. Set the build command to `npm install && npm run build`
2. Set the start command to `node dist/server.js` (You may need to compile TS first, or use `tsx server.ts` for quick deployment)
3. Add all backend environment variables (MONGODB_URI, CLOUDINARY_*, FIREBASE_SERVICE_ACCOUNT, JWT_SECRET)

## API Contract

### Auth
- `POST /api/auth/register` - Register a new donor
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Requests
- `GET /api/requests` - List open requests (Query params: bloodGroup, city, lat, lng, radius)
- `POST /api/requests` - Create a new blood request
- `PATCH /api/requests/:id/status` - Update request status

### Donations
- `GET /api/donations/me` - Get user's donation history
- `POST /api/donations` - Log a new donation
- `POST /api/donations/:id/proof` - Upload proof image, generate poster, mark as verified
