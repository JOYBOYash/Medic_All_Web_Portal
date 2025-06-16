
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
  signup: (email: string, password: string, role: 'doctor' | 'patient', displayName: string) => Promise<UserCredentialWrapper | { error: string }>;
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
      if (firebaseUser) {
        setUser(firebaseUser); // Set Firebase Auth user object
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUserProfile(profileData);
            // Redirect if user is on login/signup or root page
            if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
              if (profileData.role === 'doctor') router.push('/doctor/dashboard');
              else if (profileData.role === 'patient') router.push('/patient/dashboard');
            }
            setLoading(false); // Auth state resolved: user authenticated and profile fetched
          } else {
            // Firestore profile document does not exist
            console.error("No user profile found in Firestore for UID:", firebaseUser.uid);
            await signOut(auth); 
            // onAuthStateChanged will be triggered again with firebaseUser = null, 
            // which will then set user/userProfile to null and setLoading(false)
          }
        } catch (error) {
          console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
          await signOut(auth);
          // onAuthStateChanged will be triggered again with firebaseUser = null
        }
      } else {
        // No Firebase Auth user (initial load or after sign out)
        setUser(null);
        setUserProfile(null);
        setLoading(false); // Auth state resolved: no user authenticated
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    if (!loading && !user && (pathname.startsWith('/doctor') || pathname.startsWith('/patient'))) {
      router.push('/login');
    }
    if (!loading && user && userProfile) {
      if (pathname.startsWith('/doctor') && userProfile.role !== 'doctor') {
        logout(); 
        router.push('/login?error=role_mismatch');
      } else if (pathname.startsWith('/patient') && userProfile.role !== 'patient') {
        logout(); 
        router.push('/login?error=role_mismatch');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname, router]); 

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user, profile, and setLoading(false) eventually
      return { user: userCredential.user };
    } catch (error: any) {
      console.error("Login error:", error);
      setLoading(false); // Explicitly set loading false on direct error
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string }> => {
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
        photoURL: firebaseUser.photoURL,
      };
      await setDoc(userDocRef, { ...newUserProfile, createdAt: serverTimestamp() });
      
      // onAuthStateChanged will handle setting user, profile, and redirect. setLoading(false) will be handled there.
      return { user: firebaseUser };
    } catch (error: any) {
      console.error("Signup error:", error);
      setLoading(false); // Explicitly set loading false on direct error
      let errorMessage = "Failed to signup. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      }
      return { error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user/profile to null and loading to false.
      // It will also redirect to /login if not already there due to the other useEffect.
      // Forcing a clear navigation:
      router.push('/login'); 
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback state update if signOut somehow fails or onAuthStateChanged doesn't fire as expected
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

