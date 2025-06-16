
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
      setLoading(true); 
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUserProfile(profileData);
            if ((pathname === '/login' || pathname === '/signup' || pathname === '/') && profileData.role) {
              if (profileData.role === 'doctor') router.replace('/doctor/dashboard');
              else if (profileData.role === 'patient') router.replace('/patient/dashboard');
            }
            setLoading(false); // Profile fetched, set loading false
          } else {
            // Firestore profile document does not exist
            console.warn("No user profile found in Firestore for UID:", firebaseUser.uid); // Changed from console.error
            await signOut(auth); 
            // onAuthStateChanged will be triggered again with firebaseUser = null, 
            // which will then set user/userProfile to null and setLoading(false)
            return; // Exit early as we are signing out, setLoading(false) will happen in the next cycle.
          }
        } catch (error) {
          console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
          await signOut(auth);
          // onAuthStateChanged will handle setLoading(false) in the next cycle.
          return; // Exit early
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false); // No user, set loading false
      }
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
        photoURL: firebaseUser.photoURL || null, 
      };
      await setDoc(userDocRef, { ...newUserProfile, createdAt: serverTimestamp() });
      
      return { user: firebaseUser };
    } catch (error: any) {
      setLoading(false); 
      let errorMessage = "Failed to signup. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
        // No console.error for this handled case
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password.";
        console.error("Signup error (weak-password):", error);
      } else {
        console.error("Signup error:", error);
      }
      return { error: errorMessage, errorCode: error.code };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
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
