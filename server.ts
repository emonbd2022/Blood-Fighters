import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Firebase Admin Initialization
let db: any = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount)
    });
    db = getFirestore();
    console.log('Connected to Firebase Firestore');
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT is not defined in environment variables. Running without Firestore connection.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

// Helper to convert Firestore Timestamps to ISO strings
function convertTimestamps(obj: any): any {
  if (!obj) return obj;
  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertTimestamps(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// --- API Routes ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', firestore: db ? 'connected' : 'disconnected' });
});

// Users API
app.get('/api/users/:uid', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    res.json(convertTimestamps({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const { uid, email, displayName, photoURL } = req.body;
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      // Update existing user
      await userRef.update({
        email: email || doc.data()?.email,
        displayName: displayName || doc.data()?.displayName,
        photoURL: photoURL || doc.data()?.photoURL,
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      // Create new user
      await userRef.set({
        uid,
        email,
        displayName,
        photoURL,
        isProfileComplete: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    const updatedDoc = await userRef.get();
    res.json(convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:uid', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const updates = { ...req.body, updatedAt: FieldValue.serverTimestamp() };
    const userRef = db.collection('users').doc(req.params.uid);
    await userRef.update(updates);
    const updatedDoc = await userRef.get();
    res.json(convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Blood Requests API
app.get('/api/blood-requests', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const snapshot = await db.collection('bloodRequests').orderBy('createdAt', 'desc').get();
    const requests = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    res.json(convertTimestamps(requests));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/blood-requests', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const newRequest = {
      ...req.body,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('bloodRequests').add(newRequest);
    const doc = await docRef.get();
    res.status(201).json(convertTimestamps({ _id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/blood-requests/:id', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const updates = { ...req.body, updatedAt: FieldValue.serverTimestamp() };
    const docRef = db.collection('bloodRequests').doc(req.params.id);
    await docRef.update(updates);
    const doc = await docRef.get();
    res.json(convertTimestamps({ _id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:uid/blood-requests', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const snapshot = await db.collection('bloodRequests')
      .where('requesterUid', '==', req.params.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const requests = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    res.json(convertTimestamps(requests));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Fallback for SPA in development
    app.get('*', async (req, res, next) => {
      // Skip API routes
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (e instanceof Error) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
