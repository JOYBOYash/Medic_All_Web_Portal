
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

  const fetchUserProfile = useCallback(async (firebaseUser: User) => {
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    try {
      const userDocSnap = await getFirestoreDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data() as UserProfile;
        setUserProfile(profileData);
        return profileData;
      } else {
        throw new Error("User profile not found in Firestore.");
      }
    } catch (error) {
      console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
      throw error; // Re-throw to be caught by the caller
    }
  }, []);

  const logoutHandler = useCallback(async (options?: { suppressRedirect?: boolean }) => {
    setIsPageLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null, which will trigger the useEffect below
      if (!options?.suppressRedirect) {
        router.push('/login');
      }
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null); setUserProfile(null); setLoading(false); setIsPageLoading(false);
      if (!options?.suppressRedirect) {
        router.push('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setIsPageLoading(true); // Turn on loader during auth state change
      if (firebaseUser) {
        try {
          await fetchUserProfile(firebaseUser);
          setUser(firebaseUser);
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message === "User profile not found in Firestore." 
              ? "Your user profile could not be found. Please contact support."
              : "An error occurred while fetching your profile.",
          });
          await logoutHandler({ suppressRedirect: true });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
      // The loader is NOT turned off here. It's turned off by the page component.
    });
    return () => unsubscribe();
  }, [fetchUserProfile, logoutHandler]);

  useEffect(() => {
    // This effect handles route protection AFTER the auth state is resolved.
    if (loading) {
      // If auth is still loading, we do nothing and wait.
      // The loader is already on from the onAuthStateChanged effect.
      return;
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
    const isProtectedPath = pathname.startsWith('/doctor') || pathname.startsWith('/patient');

    if (user && userProfile) {
      // User is logged in
      if (isAuthPage) {
        setIsPageLoading(true);
        const destination = userProfile.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
        router.replace(destination);
        // The destination page will be responsible for turning off the loader.
        return;
      }

      const isCorrectPath = (pathname.startsWith('/doctor') && userProfile.role === 'doctor') ||
                            (pathname.startsWith('/patient') && userProfile.role === 'patient');

      if (isProtectedPath && !isCorrectPath) {
        // Logged in, but wrong role.
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You are not authorized for that role's dashboard.",
        });
        logoutHandler();
        return;
      }
    } else {
      // User is not logged in
      if (isProtectedPath) {
        setIsPageLoading(true);
        router.replace('/login');
        // The login page will be responsible for turning off the loader.
        return;
      }
    }
    
    // If we reach here, it means no redirect is necessary for the current page.
    // We can let the page component itself manage the loader state.
    // We do NOT turn the loader off here.

  }, [user, userProfile, loading, pathname, router, logoutHandler]);

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setIsPageLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
      return { user: userCredential.user };
    } catch (error: any) {
      setIsPageLoading(false);
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string, errorCode?: string }> => {
    setIsPageLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      const newUserProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        displayName: displayName || (role === 'doctor' ? 'Dr. New User' : 'New Patient'),
        photoURL: firebaseUser.photoURL || null, 
        contactNumber: "",
        address: "",
      };
      await setFirestoreDoc(userDocRef, {
        ...newUserProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { user: firebaseUser };
    } catch (error: any) {
      setIsPageLoading(false);
      let errorMessage = "Failed to signup. Please try again.";
      if (error.code === 'auth/email-already-in-use') errorMessage = "This email address is already in use.";
      else if (error.code === 'auth/weak-password') errorMessage = "Password is too weak.";
      if (error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password') console.error("Signup error:", error); 
      return { error: errorMessage, errorCode: error.code };
    }
  };
  
  const refreshUserProfile = async () => {
    if (user) {
        await fetchUserProfile(user);
    }
  };

  const setPageLoadingHandler = (isLoading: boolean) => {
    setIsPageLoading(isLoading);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isPageLoading, setPageLoading: setPageLoadingHandler, login, signup, logout: logoutHandler, refreshUserProfile }}>
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
