import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, signInWithGoogle, logout as firebaseLogout } from "../firebase";
import toast from "react-hot-toast";

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bloodGroup: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let userData: User;
          if (userDoc.exists()) {
            userData = userDoc.data() as User;
          } else {
            // Create new user profile
            userData = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || "Unknown User",
              email: firebaseUser.email || "",
              photoURL: firebaseUser.photoURL || "",
              bloodGroup: "", // Can be updated later
              role: "user",
            };
            await setDoc(userDocRef, {
              ...userData,
              createdAt: serverTimestamp(),
            });
          }
          setUser(userData);
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to load user profile.");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
      setUser(null);
    } catch (error: any) {
      toast.error("Failed to log out");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
