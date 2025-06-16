
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
      setLoading(true); // Start AuthContext's internal loading
      // isPageLoading will be managed by the route protection useEffect based on this new auth state

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
            await signOut(auth); // This will re-trigger onAuthStateChanged
          }
        } catch (error) {
          console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
          await signOut(auth); // Error fetching profile, log out.
        } finally {
          setLoading(false); // AuthContext's internal loading finished. Route protection effect will now run.
        }
      } else {
        // No firebaseUser (logged out or initial state check)
        setUser(null);
        setUserProfile(null);
        setLoading(false); // AuthContext's internal loading finished.
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // This effect handles route protection, redirects, and manages isPageLoading based on auth state
    if (loading) { // If AuthContext is internally busy (fetching profile, initial auth check)
      setIsPageLoading(true); // The page is effectively loading
      return;
    }

    // AuthContext's internal 'loading' is false. Now, determine page state.
    let needsRedirect = false;
    let redirectPath = '';

    const isProtectedPath = pathname.startsWith('/doctor') || pathname.startsWith('/patient');
    const isOnPublicRedirectPage = pathname === '/login' || pathname === '/signup' || pathname === '/';

    if (!user) { // No user authenticated
      if (isProtectedPath) {
        needsRedirect = true; redirectPath = '/login';
      } else {
        // On a public page and no user, this is fine. Page content should load.
        setIsPageLoading(false);
      }
    } else if (user && userProfile) { // User is authenticated and profile exists
      if (isProtectedPath) {
        // User is on a protected path, check role
        if (pathname.startsWith('/doctor') && userProfile.role !== 'doctor') {
          needsRedirect = true; logout(); redirectPath = `/login?error=role_mismatch&expected=doctor&actual=${userProfile.role}`;
        } else if (pathname.startsWith('/patient') && userProfile.role !== 'patient') {
          needsRedirect = true; logout(); redirectPath = `/login?error=role_mismatch&expected=patient&actual=${userProfile.role}`;
        }
        // If role matches, no redirect needed from AuthContext.
        // DashboardShell's pathname effect will set isPageLoading(true), page must set it false.
        // If we don't set it false here, page loader might show briefly if page loads faster than DashboardShell effect.
        // This is okay, as DashboardShell will immediately set it true for the new page component.
      } else if (isOnPublicRedirectPage) { // User is on a public page but should be redirected
        needsRedirect = true;
        if (userProfile.role === 'doctor') redirectPath = '/doctor/dashboard';
        else if (userProfile.role === 'patient') redirectPath = '/patient/dashboard';
        else { // Should not happen with defined roles
            console.error("Unknown user role for redirect:", userProfile.role);
            needsRedirect = false; // Prevent redirect to unknown state
            setIsPageLoading(false); // No redirect, ensure loader is off if on public page
        }
      } else {
        // User is on some other page (e.g. custom public page not /login, /signup, /)
        // This case should generally not lead to loader issues unless it's a misconfigured route.
        setIsPageLoading(false);
      }
    }

    if (needsRedirect && redirectPath) {
      setIsPageLoading(true); // Ensure loader is on *before* navigation
      router.replace(redirectPath);
    } else if (!isProtectedPath && !loading && !user) {
        // Fallback for ensuring public pages without user don't show loader indefinitely
        // This might be redundant with the `!user` block above but is a safeguard.
        setIsPageLoading(false);
    }
    // If on a protected path and no redirect, DashboardShell's effect for 'pathname'
    // will set isPageLoading(true), and the page component itself is responsible for setting it false.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname, router]); // `logout` is stable

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setIsPageLoading(true); // Indicate loading for login process
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged & route protection useEffect will handle profile loading, redirects, and further isPageLoading state.
      return { user: userCredential.user };
    } catch (error: any) {
      setIsPageLoading(false); // Turn off loader on login failure
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      console.error("Login error:", error.code, errorMessage);
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string, errorCode?: string }> => {
    setIsPageLoading(true); // Indicate loading for signup process
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
      // onAuthStateChanged & route protection will handle next steps.
      // Redirect to login page will happen from signup page itself, that page change will handle loader.
      return { user: firebaseUser };
    } catch (error: any) {
      setIsPageLoading(false); // Turn off loader on signup failure
      let errorMessage = "Failed to signup. Please try again.";
      if (error.code === 'auth/email-already-in-use') errorMessage = "This email address is already in use.";
      else if (error.code === 'auth/weak-password') errorMessage = "Password is too weak.";
      if (error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password') console.error("Signup error:", error); 
      return { error: errorMessage, errorCode: error.code };
    }
  };

  const logoutHandler = async () => {
    setIsPageLoading(true); // Page will change to /login
    try {
      await signOut(auth);
      // onAuthStateChanged will reset user/profile.
      // The route protection useEffect will then handle redirect to /login and setIsPageLoading(false) there.
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null); setUserProfile(null); setLoading(false); setIsPageLoading(false); // Reset states on error
      router.push('/login'); // Fallback redirect
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
    
    