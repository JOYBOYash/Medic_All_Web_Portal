
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, USERS_COLLECTION } from '@/lib/firebase';
import type { UserProfile } from '@/types/homeoconnect';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  signup: (email: string, password: string, role: 'doctor' | 'patient', displayName: string) => Promise<SignupResult>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string; }>;
}

interface LoginResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface SignupResult {
    success: boolean;
    error?: string;
    errorCode?: string;
    user?: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logoutHandler = useCallback(async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    router.push('/login');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profile = { id: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
            setUser(firebaseUser);
            setUserProfile(profile);
          } else {
            console.warn(`User profile for ${firebaseUser.uid} not found. Signing out.`);
            await logoutHandler();
          }
        } catch (error) {
           console.error("Error fetching user profile:", error);
           await logoutHandler();
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [logoutHandler]);
  
  useEffect(() => {
    if (loading) return;
    const isAuthPage = ['/login', '/signup', '/', '/forgot-password'].includes(pathname);
    if (user && userProfile && isAuthPage) {
      const destination = userProfile.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
      router.replace(destination);
    }
  }, [user, userProfile, loading, router, pathname]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      let errorMessage = "Failed to login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<SignupResult> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const newUserProfile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
        email: firebaseUser.email,
        role,
        displayName: displayName || (role === 'doctor' ? 'Dr. New User' : 'New Patient'),
        photoURL: `https://avatar.vercel.sh/${firebaseUser.uid}.svg`, 
        contactNumber: "",
        address: "",
      };
      
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      await setDoc(userDocRef, {
        id: firebaseUser.uid,
        ...newUserProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return { success: true, user: firebaseUser };

    } catch (error: any) {
      let errorMessage = "Failed to signup. Please try again.";
      if (error.code === 'auth/email-already-in-use') errorMessage = "This email address is already in use.";
      else if (error.code === 'auth/weak-password') errorMessage = "Password is too weak.";
      setLoading(false);
      return { success: false, error: errorMessage, errorCode: error.code };
    }
  };
  
  const changeUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) {
      return { success: false, error: "No user logged in." };
    }
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    
    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      return { success: true };
    } catch (error: any) {
      let errorMessage = "Failed to change password.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "The current password you entered is incorrect.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      }
      return { success: false, error: errorMessage };
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
        setLoading(true);
        const userDocRef = doc(db, USERS_COLLECTION, user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            setUserProfile({ id: userDocSnap.id, ...userDocSnap.data() } as UserProfile);
        }
        setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, signup, logout: logoutHandler, refreshUserProfile, changeUserPassword }}>
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
