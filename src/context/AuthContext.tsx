
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { auth, db, USERS_COLLECTION, getFirestoreDoc, setFirestoreDoc } from '@/lib/firebase'; // Adjusted imports
import type { UserProfile } from '@/types/homeoconnect';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean; // Indicates auth context's own loading (e.g., fetching profile)
  isPageLoading: boolean; // Global page loading indicator for navigation/content readiness
  setPageLoading: (isLoading: boolean) => void;
  login: (email: string, password: string) => Promise<UserCredentialWrapper | { error: string }>;
  signup: (email: string, password: string, role: 'doctor' | 'patient', displayName: string) => Promise<UserCredentialWrapper | { error: string, errorCode?: string }>;
  logout: () => Promise<void>;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getFirestoreDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUser(firebaseUser);
            setUserProfile(profileData);
          } else {
            console.warn("No user profile found in Firestore for UID:", firebaseUser.uid, "Logging out.");
            await signOut(auth);
          }
        } catch (error) {
          console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
          await signOut(auth);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const logoutHandler = async () => {
    setIsPageLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null, which will trigger the useEffect below to redirect to /login
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null); setUserProfile(null); setLoading(false); setIsPageLoading(false);
      router.push('/login');
    }
  };

  useEffect(() => {
    // If auth state is still being determined, show a full-page loader.
    if (loading) {
      setIsPageLoading(true);
      return;
    }

    const isProtectedPath = pathname.startsWith('/doctor') || pathname.startsWith('/patient');
    const isOnPublicRedirectPage = pathname === '/login' || pathname === '/signup' || pathname === '/';

    // If user is logged in (and we have their profile)
    if (user && userProfile) {
      // If they are on a public page like /login, redirect them to their dashboard.
      if (isOnPublicRedirectPage) {
        setIsPageLoading(true); // Show loader for the redirect
        const destination = userProfile.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
        router.replace(destination);
        return; // End execution for this render
      }

      // If they are on a protected page, ensure it's the correct one for their role.
      const isCorrectPath = (pathname.startsWith('/doctor') && userProfile.role === 'doctor') ||
                            (pathname.startsWith('/patient') && userProfile.role === 'patient');

      if (isProtectedPath && !isCorrectPath) {
        setIsPageLoading(true);
        logoutHandler(); // This will trigger a redirect to /login via onAuthStateChanged
        return;
      }
    } 
    // If user is NOT logged in
    else {
      // If they are trying to access a protected page, redirect to login.
      if (isProtectedPath) {
        setIsPageLoading(true);
        router.replace('/login');
        return;
      }

      // On a public page and not logged in is the correct state. Turn off loader.
      setIsPageLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname]);


  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setIsPageLoading(true); // Start loading indicator immediately on click
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest of the logic, including redirect.
      return { user: userCredential.user };
    } catch (error: any) {
      setIsPageLoading(false); // Stop loading on error
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      console.error("Login error:", error.code, errorMessage);
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string, errorCode?: string }> => {
    setIsPageLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      const newUserProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        displayName: displayName || (role === 'doctor' ? 'Dr. New User' : 'New Patient'),
        photoURL: firebaseUser.photoURL || null, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setFirestoreDoc(userDocRef, newUserProfile); 
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

  const setPageLoadingHandler = (isLoading: boolean) => {
    setIsPageLoading(isLoading);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isPageLoading, setPageLoading: setPageLoadingHandler, login, signup, logout: logoutHandler }}>
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
