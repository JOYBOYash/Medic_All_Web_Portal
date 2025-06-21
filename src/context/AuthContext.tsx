
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, USERS_COLLECTION } from '@/lib/firebase';
import type { UserProfile } from '@/types/homeoconnect';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isPageLoading: boolean;
  setPageLoading: (isLoading: boolean) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  signup: (email: string, password: string, role: 'doctor' | 'patient', displayName: string) => Promise<SignupResult>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

interface LoginResult {
  success: boolean;
  error?: string;
  user?: User;
  userProfile?: UserProfile;
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
  const [isPageLoading, setIsPageLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This effect handles the initial authentication state and subsequent changes.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If we already have the profile for this user, don't refetch
        if (userProfile && userProfile.id === firebaseUser.uid) {
            setLoading(false);
            setIsPageLoading(false); // Stop global loader if profile is already loaded
            return;
        }
        
        // Fetch user profile from Firestore.
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const profile = userDocSnap.data() as UserProfile;
                setUser(firebaseUser);
                setUserProfile(profile);
            } else {
                // This case should ideally not happen if signup is atomic.
                // But if it does, it's a critical error.
                console.error(`CRITICAL: User profile for ${firebaseUser.uid} not found. Logging out.`);
                await signOut(auth); // This will trigger the onAuthStateChanged listener again to clear state.
            }
        } catch(e) {
            console.error("Error fetching user profile during auth state change:", e);
            await signOut(auth);
        }

      } else {
        // No user is signed in
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
      setIsPageLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    // This effect handles route protection AFTER the initial auth state is resolved.
    if (loading) return; // Don't run route protection while still loading auth state

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
    const isDoctorRoute = pathname.startsWith('/doctor');
    const isPatientRoute = pathname.startsWith('/patient');

    if (user && userProfile) {
      // User is logged in
      if (isAuthPage) {
        // If on an auth page, redirect to the appropriate dashboard
        const destination = userProfile.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
        router.replace(destination);
      } else {
        // If on a protected page, verify role
        const isCorrectDoctorRoute = isDoctorRoute && userProfile.role === 'doctor';
        const isCorrectPatientRoute = isPatientRoute && userProfile.role === 'patient';

        // If user is on a dashboard that doesn't match their role
        if ((isDoctorRoute || isPatientRoute) && !isCorrectDoctorRoute && !isCorrectPatientRoute) {
          toast({ variant: "destructive", title: "Access Denied", description: "Incorrect role for this dashboard." });
          logout(); // The logout function will redirect to /login
        }
      }
    } else {
      // No user is logged in
      if (isDoctorRoute || isPatientRoute) {
        // If trying to access a protected route, redirect to login
        router.replace('/login');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname, router]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsPageLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and userProfile state.
      // We don't need to manually set it here anymore, preventing race conditions.
      // The useEffect will handle redirection.
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      let errorMessage = "Failed to login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      toast({ variant: "destructive", title: "Login Failed", description: errorMessage });
      setIsPageLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<SignupResult> => {
    setIsPageLoading(true);
    try {
      // This part remains the same: create user in Auth.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create the profile document atomically.
      const newUserProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        displayName: displayName || (role === 'doctor' ? 'Dr. New User' : 'New Patient'),
        photoURL: firebaseUser.photoURL || null, 
        contactNumber: "",
        address: "",
      };
      
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      await setDoc(userDocRef, {
        ...newUserProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Crucially, onAuthStateChanged will now reliably find this document.
      // We don't set local state here; we let the listener do its job.
      return { success: true, user: firebaseUser };

    } catch (error: any) {
      let errorMessage = "Failed to signup. Please try again.";
      if (error.code === 'auth/email-already-in-use') errorMessage = "This email address is already in use.";
      else if (error.code === 'auth/weak-password') errorMessage = "Password is too weak.";
      toast({ variant: "destructive", title: "Signup Failed", description: errorMessage });
      setIsPageLoading(false);
      return { success: false, error: errorMessage, errorCode: error.code };
    }
  };
  
  const logoutHandler = useCallback(async () => {
    setIsPageLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will clear user/userProfile state.
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log out. Please try again." });
    } finally {
      // Redirect is now handled by the route protection useEffect.
      setIsPageLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUserProfile = async () => {
    if (user) {
        const userDocRef = doc(db, USERS_COLLECTION, user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
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
