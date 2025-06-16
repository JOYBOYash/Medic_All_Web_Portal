
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
  loading: boolean;
  isPageLoading: boolean; // New state for global page loading
  setPageLoading: (isLoading: boolean) => void; // New setter
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
  const [isPageLoading, setIsPageLoading] = useState(false); // Initialize page loading state
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true); 
        setIsPageLoading(true); // Start page loading when auth state changes

        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getFirestoreDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUser(firebaseUser); 
            setUserProfile(profileData);
            
            if ((pathname === '/login' || pathname === '/signup' || pathname === '/') && profileData.role) {
              if (profileData.role === 'doctor') {
                router.replace('/doctor/dashboard');
              } else if (profileData.role === 'patient') {
                router.replace('/patient/dashboard');
              }
            }
          } else {
            console.warn("No user profile found in Firestore for UID:", firebaseUser.uid);
            await signOut(auth); 
          }
        } catch (error) {
          console.error("Error fetching user profile for UID:", firebaseUser.uid, error);
          await signOut(auth); 
        } finally {
          setLoading(false);
          setIsPageLoading(false); // End page loading after profile fetch/auth check
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        setIsPageLoading(false); // End page loading if no user
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (!loading) { 
        if (!user && (pathname.startsWith('/doctor') || pathname.startsWith('/patient'))) {
            setIsPageLoading(true);
            router.replace('/login');
        } else if (user && userProfile) {
            if (pathname.startsWith('/doctor') && userProfile.role !== 'doctor') {
              setIsPageLoading(true);
              logout(); 
              router.replace(`/login?error=role_mismatch&expected=doctor&actual=${userProfile.role}`);
            } else if (pathname.startsWith('/patient') && userProfile.role !== 'patient') {
              setIsPageLoading(true);
              logout(); 
              router.replace(`/login?error=role_mismatch&expected=patient&actual=${userProfile.role}`);
            } else if ((pathname === '/login' || pathname === '/signup' || pathname === '/')) {
                 setIsPageLoading(true);
                 if (userProfile.role === 'doctor') {
                    router.replace('/doctor/dashboard');
                } else if (userProfile.role === 'patient') {
                    router.replace('/patient/dashboard');
                } else {
                    setIsPageLoading(false); // No redirect needed, stop loading
                }
            }
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, pathname]); 

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setLoading(true);
    setIsPageLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user, profile, and setIsPageLoading(false)
      return { user: userCredential.user };
    } catch (error: any) {
      console.error("Login error:", error);
      setLoading(false); 
      setIsPageLoading(false);
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      return { error: errorMessage };
    }
  };

  const signup = async (email: string, password: string, role: 'doctor' | 'patient', displayName: string): Promise<UserCredentialWrapper | { error: string, errorCode?: string }> => {
    setLoading(true);
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
        createdAt: serverTimestamp(), // Add createdAt here
        updatedAt: serverTimestamp(), // Add updatedAt here
      };
      await setFirestoreDoc(userDocRef, newUserProfile); 
      // onAuthStateChanged will handle setting user, profile, and setIsPageLoading(false)
      return { user: firebaseUser };
    } catch (error: any) {
      setLoading(false); 
      setIsPageLoading(false);
      let errorMessage = "Failed to signup. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      }
      
      if (error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password') {
        console.error("Signup error:", error); 
      }
      return { error: errorMessage, errorCode: error.code };
    }
  };

  const logoutHandler = async () => { // Renamed to avoid conflict with hook's logout
    setIsPageLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user/profile to null and loading states to false
      router.push('/login'); 
    } catch (error) {
      console.error("Logout error:", error);
      // Ensure states are reset even on error
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      setIsPageLoading(false);
      router.push('/login');
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
    
