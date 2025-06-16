
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
  const [loading, setLoading] = useState(true); // Auth context loading
  const [isPageLoading, setIsPageLoading] = useState(true); // Page loading, start true
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Start auth context loading for this state change

      if (firebaseUser) {
        // User is authenticated, try to fetch profile
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getFirestoreDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUser(firebaseUser);
            setUserProfile(profileData);
            setLoading(false); // Auth context loading finished for this user

            // Determine if a redirect from a public page is needed.
            // The route protection useEffect will handle more complex role-based redirects.
            const isOnPublicRedirectPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
            if (isOnPublicRedirectPage && profileData.role) {
              // Redirect is expected. The route protection useEffect will manage isPageLoading(true) for this.
            } else {
              // User authenticated, profile loaded, and not on a page requiring immediate redirect from onAuthStateChanged.
              // Set isPageLoading to false. DashboardShell/page will manage it for content.
              setIsPageLoading(false);
            }
          } else {
            // Profile doesn't exist, critical issue. Log out user.
            console.warn("No user profile found in Firestore for UID:", firebaseUser.uid, "Logging out.");
            await signOut(auth); // This will re-trigger onAuthStateChanged with firebaseUser = null
            // States (user, userProfile, loading, isPageLoading) will be reset in the !firebaseUser block.
          }
        } catch (error) {
          console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
          await signOut(auth); // Error fetching profile, log out.
        }
      } else {
        // No firebaseUser (logged out or initial state check)
        setUser(null);
        setUserProfile(null);
        setLoading(false); // Auth context loading finished
        setIsPageLoading(false); // No user, so likely on a public page or login, stop global page loader.
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Pathname is not a dependency here.

  useEffect(() => {
    // This effect handles route protection and redirects based on current auth state and path
    if (!loading) { // Ensure auth context initial loading is complete
      let needsRedirect = false;
      let redirectPath = '';

      if (!user && (pathname.startsWith('/doctor') || pathname.startsWith('/patient'))) {
        needsRedirect = true; redirectPath = '/login';
      } else if (user && userProfile) {
        if (pathname.startsWith('/doctor') && userProfile.role !== 'doctor') {
          needsRedirect = true; logout(); redirectPath = `/login?error=role_mismatch&expected=doctor&actual=${userProfile.role}`;
        } else if (pathname.startsWith('/patient') && userProfile.role !== 'patient') {
          needsRedirect = true; logout(); redirectPath = `/login?error=role_mismatch&expected=patient&actual=${userProfile.role}`;
        } else if ((pathname === '/login' || pathname === '/signup' || pathname === '/')) {
          needsRedirect = true;
          if (userProfile.role === 'doctor') redirectPath = '/doctor/dashboard';
          else if (userProfile.role === 'patient') redirectPath = '/patient/dashboard';
          else needsRedirect = false; // Should not happen with defined roles
        }
      }

      if (needsRedirect && redirectPath) {
        setIsPageLoading(true); // Set page loading true for the navigation
        router.replace(redirectPath);
      }
      // If no redirect, current page (if any) is responsible for its loader state.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname]);


  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setIsPageLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user, profile, and further loading states.
      return { user: userCredential.user };
    } catch (error: any) {
      setIsPageLoading(false);
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
      // onAuthStateChanged will handle user/profile. Redirect to login page handles loader.
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

  const logoutHandler = async () => {
    setIsPageLoading(true); // Page will change to /login
    try {
      await signOut(auth);
      // onAuthStateChanged will reset user/profile and set isPageLoading(false) when !user.
      // The route protection useEffect will then handle redirect to /login if not already there.
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
    
