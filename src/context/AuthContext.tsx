
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // If we have the profile for this UID already, no need to re-process.
            if (userProfile && userProfile.id === firebaseUser.uid) {
                setLoading(false);
                setIsPageLoading(false);
                return;
            }

            const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

            const fetchAndSetProfile = async () => {
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const profile = { id: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
                    setUser(firebaseUser);
                    setUserProfile(profile);
                    return true;
                }
                return false;
            };

            try {
                const profileExists = await fetchAndSetProfile();

                if (!profileExists) {
                    const creationTime = firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : 0;
                    const lastSignInTime = firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).getTime() : 0;
                    const isNewUser = Math.abs(lastSignInTime - creationTime) < 5000; // 5-second window for new user

                    if (isNewUser) {
                        setTimeout(async () => {
                            const profileExistsOnRetry = await fetchAndSetProfile();
                            if (!profileExistsOnRetry) {
                                console.error(`CRITICAL: User profile for ${firebaseUser.uid} not found on retry. Logging out.`);
                                await signOut(auth);
                            }
                        }, 2500); // Increased retry delay
                    } else {
                        console.error(`CRITICAL: Existing user profile for ${firebaseUser.uid} not found. Logging out.`);
                        await signOut(auth);
                    }
                }
            } catch (e) {
                console.error("Error processing auth state change:", e);
                await signOut(auth);
            }
        } else {
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
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
    const isDoctorRoute = pathname.startsWith('/doctor');
    const isPatientRoute = pathname.startsWith('/patient');

    if (user && userProfile) {
      if (isAuthPage) {
        const destination = userProfile.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
        router.replace(destination);
      } else {
        const isCorrectDoctorRoute = isDoctorRoute && userProfile.role === 'doctor';
        const isCorrectPatientRoute = isPatientRoute && userProfile.role === 'patient';
        if ((isDoctorRoute || isPatientRoute) && !isCorrectDoctorRoute && !isCorrectPatientRoute) {
          toast({ variant: "destructive", title: "Access Denied", description: "Incorrect role for this dashboard." });
          logoutHandler({ suppressRedirect: true }); 
        }
      }
    } else {
      if (isDoctorRoute || isPatientRoute) {
        router.replace('/login');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsPageLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting state and redirection.
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const newUserProfile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
        email: firebaseUser.email,
        role,
        displayName: displayName || (role === 'doctor' ? 'Dr. New User' : 'New Patient'),
        photoURL: firebaseUser.photoURL || null, 
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
      
      // onAuthStateChanged will now reliably find this document and handle state updates.
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
  
  const logoutHandler = useCallback(async ({ suppressRedirect = false } = {}) => {
    setIsPageLoading(true);
    await signOut(auth);
    // onAuthStateChanged clears state. The route protection useEffect handles the redirect.
    if (!suppressRedirect) {
      router.push('/login');
    }
    // No finally block needed for setIsPageLoading(false) because onAuthStateChanged handles it.
  }, [router]);

  const refreshUserProfile = async () => {
    if (user) {
        const userDocRef = doc(db, USERS_COLLECTION, user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            setUserProfile({ id: userDocSnap.id, ...userDocSnap.data() } as UserProfile);
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
