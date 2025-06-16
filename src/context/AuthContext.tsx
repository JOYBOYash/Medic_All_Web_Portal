
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; // Assuming firebase.ts exports auth and db
import type { UserProfile } from '@/types/homeoconnect';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserCredentialWrapper | { error: string }>;
  signup: (email: string, password: string, role: 'doctor' | 'patient', displayName: string) => Promise<UserCredentialWrapper | { error: string }>;
  logout: () => Promise<void>;
}

// Wrapper to avoid Firebase's internal UserCredential type in public API
interface UserCredentialWrapper {
  user: User;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user profile from Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          // This case should ideally not happen if signup creates a profile
          console.error("No user profile found in Firestore for UID:", firebaseUser.uid);
          setUserProfile(null); 
          // Potentially logout or redirect if profile is mandatory
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user && (pathname.startsWith('/doctor') || pathname.startsWith('/patient'))) {
      router.push('/login');
    }
    if (!loading && user && userProfile) {
      if (pathname.startsWith('/doctor') && userProfile.role !== 'doctor') {
        router.push('/login?error=role_mismatch');
      } else if (pathname.startsWith('/patient') && userProfile.role !== 'patient') {
        router.push('/login?error=role_mismatch');
      }
    }
  }, [user, userProfile, loading, pathname, router]);

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and profile
      return { user: userCredential.user };
    } catch (error: any) {
      console.error("Login error:", error);
      setLoading(false);
      return { error: error.message || "Failed to login." };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string }> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user profile in Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const newUserProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        displayName: displayName || (role === 'doctor' ? 'Dr. New User' : 'New Patient'),
        photoURL: firebaseUser.photoURL,
        // createdAt: serverTimestamp() // Requires an import
      };
      await setDoc(userDocRef, { ...newUserProfile, createdAt: serverTimestamp() });
      
      setUser(firebaseUser);
      setUserProfile(newUserProfile);
      setLoading(false);
      return { user: firebaseUser };
    } catch (error: any) {
      console.error("Signup error:", error);
      setLoading(false);
      return { error: error.message || "Failed to signup." };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

