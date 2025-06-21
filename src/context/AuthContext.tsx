
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { auth, db, USERS_COLLECTION, getFirestoreDoc, setFirestoreDoc } from '@/lib/firebase'; // Adjusted imports
import type { UserProfile } from '@/types/homeoconnect';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean; // Indicates auth context's own loading (e.g., fetching profile)
  isPageLoading: boolean; // Global page loading indicator for navigation/content readiness
  setPageLoading: (isLoading: boolean) => void;
  login: (email: string, password: string) => Promise<UserCredentialWrapper | { error: string }>;
  signup: (email: string, password: string, role: 'doctor' | 'patient', displayName: string) => Promise<UserCredentialWrapper | { error: string, errorCode?: string }>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

interface UserCredentialWrapper {
  user: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Auth context's internal loading state
  const [isPageLoading, setIsPageLoading] = useState(true); // Global page loading state
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = useCallback(async (firebaseUser: User): Promise<UserProfile | null> => {
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    const userDocSnap = await getFirestoreDoc(userDocRef);
    if (userDocSnap.exists()) {
        const profileData = userDocSnap.data() as UserProfile;
        return profileData;
    }
    return null;
  }, []);

  const logoutHandler = useCallback(async (options?: { suppressRedirect?: boolean }) => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      if (!options?.suppressRedirect) {
        router.push('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        let profile = await fetchUserProfile(firebaseUser);

        // Handle signup race condition where profile might not exist yet
        if (!profile) {
            console.warn("User profile not found, retrying in 1.5s...");
            await new Promise(res => setTimeout(res, 1500));
            profile = await fetchUserProfile(firebaseUser);
        }
        
        if (profile) {
            setUserProfile(profile);
            setUser(firebaseUser);
        } else {
            console.error(`CRITICAL: User profile for ${firebaseUser.uid} not found after retry. Logging out.`);
            await logoutHandler({ suppressRedirect: true });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile, logoutHandler]);

  useEffect(() => {
    // This effect handles route protection AFTER the auth state is resolved.
    if (loading) return; // Wait until the initial auth check is complete.

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
    const isDoctorRoute = pathname.startsWith('/doctor');
    const isPatientRoute = pathname.startsWith('/patient');

    if (user && userProfile) {
      // User is logged in.
      if (isAuthPage) {
        // If on an auth page, redirect to the correct dashboard.
        const destination = userProfile.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
        router.replace(destination);
        return;
      }

      // Check for role mismatch on protected routes.
      const isCorrectDoctorRoute = isDoctorRoute && userProfile.role === 'doctor';
      const isCorrectPatientRoute = isPatientRoute && userProfile.role === 'patient';

      if ((isDoctorRoute || isPatientRoute) && !isCorrectDoctorRoute && !isCorrectPatientRoute) {
        toast({ variant: "destructive", title: "Access Denied", description: "You are not authorized for this dashboard." });
        logoutHandler();
      }

    } else {
      // User is not logged in.
      if (isDoctorRoute || isPatientRoute) {
        // If on a protected route, redirect to login.
        router.replace('/login');
      }
    }
  }, [user, userProfile, loading, pathname, router, logoutHandler]);

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting state and redirection
      return { user: userCredential.user };
    } catch (error: any) {
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string, errorCode?: string }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      const newUserProfile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'id'> = {
        email: firebaseUser.email,
        role,
        displayName: displayName || (role === 'doctor' ? 'Dr. New User' : 'New Patient'),
        photoURL: firebaseUser.photoURL || null, 
        contactNumber: "",
        address: "",
      };
      await setFirestoreDoc(userDocRef, {
        ...newUserProfile,
        id: firebaseUser.uid, // Ensure ID is written to the document
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // onAuthStateChanged will handle setting state and redirection
      return { user: firebaseUser };
    } catch (error: any) {
      let errorMessage = "Failed to signup. Please try again.";
      if (error.code === 'auth/email-already-in-use') errorMessage = "This email address is already in use.";
      else if (error.code === 'auth/weak-password') errorMessage = "Password is too weak.";
      if (error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password') console.error("Signup error:", error); 
      return { error: errorMessage, errorCode: error.code };
    }
  };
  
  const refreshUserProfile = async () => {
    if (user) {
        const profile = await fetchUserProfile(user);
        if (profile) {
            setUserProfile(profile);
        }
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isPageLoading, setPageLoading: setIsPageLoading, login, signup, logout: logoutHandler, refreshUserProfile }}>
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
