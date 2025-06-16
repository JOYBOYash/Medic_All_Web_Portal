
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
      setLoading(true); // Start auth context loading

      if (firebaseUser) {
        setIsPageLoading(true); // Assume page will load or redirect
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getFirestoreDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUser(firebaseUser);
            setUserProfile(profileData);

            // If user is on login/signup/root but is authenticated, redirect them.
            // Set page loading true before this redirect.
            if ((pathname === '/login' || pathname === '/signup' || pathname === '/') && profileData.role) {
              if (profileData.role === 'doctor') router.replace('/doctor/dashboard');
              else if (profileData.role === 'patient') router.replace('/patient/dashboard');
              // The target page will be responsible for setting isPageLoading(false)
            } else {
              // If not redirecting, the current page (if under DashboardShell) is responsible for its loader.
              // If DashboardShell is not active (e.g. user lands directly on a protected page URL before shell mounts),
              // the page component itself must handle setting isPageLoading(false).
              // This scenario is covered by individual pages setting it false.
            }
          } else {
            console.warn("No user profile found in Firestore for UID:", firebaseUser.uid);
            await signOut(auth); // This will trigger onAuthStateChanged again with firebaseUser = null
            setUser(null); setUserProfile(null); setIsPageLoading(false);
          }
        } catch (error) {
          console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
          await signOut(auth);
          setUser(null); setUserProfile(null); setIsPageLoading(false);
        } finally {
          setLoading(false); // Auth context loading is finished for this phase
          // Do not set setIsPageLoading(false) here generally, as the current page or redirect target handles it.
        }
      } else { // No firebaseUser (logged out or initial state)
        setUser(null);
        setUserProfile(null);
        setLoading(false); // Auth context loading finished
        setIsPageLoading(false); // No user, so probably on a public page or login, stop global page loader.
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Pathname is intentionally not a dependency here, this effect is for auth state changes.

  useEffect(() => {
    // This effect handles route protection based on current auth state and path
    if (!loading) { // Ensure auth context loading is complete
      let needsRedirectAndPageLoad = false;

      if (!user && (pathname.startsWith('/doctor') || pathname.startsWith('/patient'))) {
        // Not logged in but trying to access protected routes
        needsRedirectAndPageLoad = true; router.replace('/login');
      } else if (user && userProfile) {
        // Logged in, check for role mismatches or redirects from public pages
        if (pathname.startsWith('/doctor') && userProfile.role !== 'doctor') {
          needsRedirectAndPageLoad = true; logout(); router.replace(`/login?error=role_mismatch&expected=doctor&actual=${userProfile.role}`);
        } else if (pathname.startsWith('/patient') && userProfile.role !== 'patient') {
          needsRedirectAndPageLoad = true; logout(); router.replace(`/login?error=role_mismatch&expected=patient&actual=${userProfile.role}`);
        } else if ((pathname === '/login' || pathname === '/signup' || pathname === '/')) {
          // User is on a public page but is already logged in
          needsRedirectAndPageLoad = true;
          if (userProfile.role === 'doctor') router.replace('/doctor/dashboard');
          else if (userProfile.role === 'patient') router.replace('/patient/dashboard');
          else needsRedirectAndPageLoad = false; // Should not happen with defined roles
        }
      }

      if (needsRedirectAndPageLoad) {
        setIsPageLoading(true); // Set page loading true if a redirect to a shell-managed page is happening
      }
      // If no redirect condition is met, the current page is responsible for its own loader state.
      // We don't set setIsPageLoading(false) here because the redirection itself will trigger a new page load cycle.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname]); // `logout` is stable from `useCallback` if we were to define it with it.

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    // setLoading(true); // Auth context loading starts, onAuthStateChanged will handle more
    setIsPageLoading(true); // Indicate page transition might occur
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will set user, profile, and manage further isPageLoading states.
      return { user: userCredential.user };
    } catch (error: any) {
      console.error("Login error:", error);
      // setLoading(false); // Auth context loading ends on error
      setIsPageLoading(false); // Stop page loading on login error
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string, errorCode?: string }> => {
    // setLoading(true);
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
      // onAuthStateChanged will handle setting user, profile. Redirect to login will manage loader.
      return { user: firebaseUser };
    } catch (error: any) {
      // setLoading(false);
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
      // onAuthStateChanged will handle user/profile reset and set isPageLoading(false)
      // No need to explicitly push router here, onAuthStateChanged and route protection useEffect will handle it.
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
    
