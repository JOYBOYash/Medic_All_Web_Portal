
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, USERS_COLLECTION } from '@/lib/firebase';
import type { UserProfile } from '@/types/homeoconnect';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Set loading true at the start of auth state change processing
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUserProfile(profileData);
            // Redirect if user is on login/signup or root page
            if ((pathname === '/login' || pathname === '/signup' || pathname === '/') && profileData.role) {
              if (profileData.role === 'doctor') router.replace('/doctor/dashboard');
              else if (profileData.role === 'patient') router.replace('/patient/dashboard');
            }
          } else {
            console.error("No user profile found in Firestore for UID:", firebaseUser.uid);
            // If profile doesn't exist, sign out the user to prevent inconsistent state.
            // This will re-trigger onAuthStateChanged with a null user.
            await signOut(auth); 
            // No need to set user/profile to null here, onAuthStateChanged will handle it
            // setLoading(false) will also be handled by the re-triggered call
            return; // Exit early as we are signing out
          }
        } catch (error) {
          console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
          await signOut(auth);
          // setLoading(false) will be handled by the re-triggered call
          return; // Exit early
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false); // Set loading to false after all processing for this auth state change is done
    });

    return () => unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    if (!loading && !user && (pathname.startsWith('/doctor') || pathname.startsWith('/patient'))) {
      router.replace('/login');
    }
    if (!loading && user && userProfile) {
      if (pathname.startsWith('/doctor') && userProfile.role !== 'doctor') {
        logout(); 
        router.replace(`/login?error=role_mismatch&expected=doctor&actual=${userProfile.role}`);
      } else if (pathname.startsWith('/patient') && userProfile.role !== 'patient') {
        logout(); 
        router.replace(`/login?error=role_mismatch&expected=patient&actual=${userProfile.role}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname, router]); // logout is stable

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user, profile. setLoading(false) called by onAuthStateChanged.
      return { user: userCredential.user };
    } catch (error: any) {
      console.error("Login error:", error);
      setLoading(false); 
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string, errorCode?: string }> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      const newUserProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        displayName: displayName || (role === 'doctor' ? 'Dr. New User' : 'New Patient'),
        photoURL: firebaseUser.photoURL || null, // Ensure photoURL is null if not present
      };
      await setDoc(userDocRef, { ...newUserProfile, createdAt: serverTimestamp() });
      
      // onAuthStateChanged will handle setting user, profile, and redirect. setLoading(false) called by onAuthStateChanged.
      return { user: firebaseUser };
    } catch (error: any) {
      setLoading(false); 
      let errorMessage = "Failed to signup. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
        // We don't console.error here because it's a handled case (redirect to login)
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password.";
        console.error("Signup error (weak-password):", error);
      } else {
        // For other errors, log them
        console.error("Signup error:", error);
      }
      return { error: errorMessage, errorCode: error.code };
    }
  };

  const logout = async () => {
    // setLoading(true); // Optional: can make UI seem more responsive to logout click
    try {
      await signOut(auth);
      // onAuthStateChanged will set user/profile to null and loading to false.
      // It will also redirect to /login if not already there due to the other useEffect.
      // Forcing a clear navigation:
      router.push('/login'); 
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      router.push('/login');
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

