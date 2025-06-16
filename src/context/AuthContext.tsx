
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
        setUser(firebaseUser);
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profileData = userDocSnap.data() as UserProfile;
          setUserProfile(profileData);
          // Initial redirect after profile is loaded
          if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
            if (profileData.role === 'doctor') router.push('/doctor/dashboard');
            else if (profileData.role === 'patient') router.push('/patient/dashboard');
          }
        } else {
          console.error("No user profile found in Firestore for UID:", firebaseUser.uid);
          // This case can happen if signup process was interrupted
          // Or if a user exists in Auth but not in Firestore users collection.
          // For robustness, consider creating a profile here if it's missing, or logging out.
          setUserProfile(null); 
          // await signOut(auth); // Decide on handling this: logout or attempt profile creation
          // setUser(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    if (!loading && !user && (pathname.startsWith('/doctor') || pathname.startsWith('/patient'))) {
      router.push('/login');
    }
    if (!loading && user && userProfile) {
      if (pathname.startsWith('/doctor') && userProfile.role !== 'doctor') {
        logout(); // Log out user with incorrect role for dashboard
        router.push('/login?error=role_mismatch');
      } else if (pathname.startsWith('/patient') && userProfile.role !== 'patient') {
        logout(); // Log out user with incorrect role for dashboard
        router.push('/login?error=role_mismatch');
      }
    }
  }, [user, userProfile, loading, pathname, router]);

  const login = async (email: string, password: string): Promise<UserCredentialWrapper | { error: string }> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and profile, and subsequent redirection
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
      
      // setUser(firebaseUser); // onAuthStateChanged will handle this
      // setUserProfile(newUserProfile); // onAuthStateChanged will handle this
      // setLoading(false); // onAuthStateChanged will handle this
      return { user: firebaseUser };
    } catch (error: any) {
      console.error("Signup error:", error);
      setLoading(false);
      let errorMessage = "Failed to signup. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      }
      return { error: errorMessage };
    }
  };

  const logout = async () => {
    // setLoading(true); // Not strictly needed here as onAuthStateChanged will set loading
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      router.push('/login'); // Ensure redirection to login after logout
    } catch (error) {
      console.error("Logout error:", error);
    } 
    // finally { setLoading(false); } // onAuthStateChanged handles this
  };
  
  // Expose a way to update userProfile in context if it's changed elsewhere (e.g. profile page)
  // const updateProfileInContext = (profile: UserProfile) => {
  //   setUserProfile(profile);
  // }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export useAuth hook with explicit state type for easier consumption if needed
export const useAuth = (): AuthContextType & { getState?: () => { user: User | null, userProfile: UserProfile | null, loading: boolean } } => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Add getState for specific scenarios if direct state access is needed outside of reactive updates
  // (though generally prefer reactive updates through useEffect)
  // const getState = () => ({ user: context.user, userProfile: context.userProfile, loading: context.loading });
  // return { ...context, getState };
  return context;
};
