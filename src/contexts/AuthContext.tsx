import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db, messaging } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          lastReadNotifications: parsed.lastReadNotifications ? new Date(parsed.lastReadNotifications) : undefined,
          createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined,
          updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : undefined
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const generateDonorId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'ROKTO-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const requestNotificationPermission = async (userId: string) => {
    if (typeof window === 'undefined' || !messaging) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });
        if (token) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmToken: token,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  };

  const fetchProfile = async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.donorId) {
          const donorId = generateDonorId();
          await setDoc(userRef, { donorId }, { merge: true });
          data.donorId = donorId;
        }
        const profile = { 
          id: docSnap.id, 
          ...data,
          lastReadNotifications: data.lastReadNotifications?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as any;
        setUserProfile(profile);
        localStorage.setItem('user_profile', JSON.stringify(profile));
        
        // Request notification permission and get token
        requestNotificationPermission(currentUser.uid);
      } else {
        // Create user if not found
        const newUser = {
          uid: currentUser.uid,
          donorId: generateDonorId(),
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Anonymous',
          photoURL: currentUser.photoURL || '',
          isProfileComplete: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        try {
          await setDoc(userRef, newUser);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
        }
        setUserProfile({ id: currentUser.uid, ...newUser } as unknown as UserProfile);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // The onAuthStateChanged listener will handle fetching/creating the profile
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user_profile');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, logout, refreshProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
