
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
// import { getAnalytics } from "firebase/analytics"; // Optional

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase config values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-app-id",
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "your-measurement-id" // Optional
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (typeof window !== 'undefined' && !getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    // if (firebaseConfig.measurementId && process.env.NODE_ENV === 'production') { // Only init analytics in prod
    //   getAnalytics(app);
    // }
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Fallback or error display logic can be added here
  }
} else if (typeof window !== 'undefined') {
  app = getApp(); // This will throw if no app is initialized, so the above catch should handle it
  auth = getAuth(app);
  db = getFirestore(app);
}

// Exporting as potentially undefined for server components or if init fails
export { app, auth, db };

// Firestore collection constants
export const USERS_COLLECTION = "users";
export const PATIENTS_COLLECTION = "patients";
export const MEDICINES_COLLECTION = "medicines";
export const APPOINTMENTS_COLLECTION = "appointments";

// Helper functions for Firestore (examples)
// You might want to move these to a separate api/service file or keep them here if simple

/**
 * Creates a user profile document in Firestore.
 * @param userId The Firebase Auth user ID.
 * @param data The user profile data (email, role, displayName).
 */
export const createUserProfileDocument = async (userId: string, data: { email: string | null, role: 'doctor' | 'patient', displayName?: string | null, photoURL?: string | null }) => {
  if (!userId) return;
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const userProfileData = {
    uid: userId,
    ...data,
    createdAt: serverTimestamp(),
  };
  try {
    await setDoc(userDocRef, userProfileData);
    return userProfileData;
  } catch (error) {
    console.error("Error creating user profile document: ", error);
    throw error;
  }
};

/**
 * Fetches a user profile document from Firestore.
 * @param userId The Firebase Auth user ID.
 */
export const getUserProfileDocument = async (userId: string) => {
  if (!userId) return null;
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("No such user profile document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile document: ", error);
    throw error;
  }
};

// Add more specific CRUD functions for your collections as needed
// e.g., addPatient, getPatientsForDoctor, addMedicine, etc.
export { collection, addDoc, getDocs, query, where, doc, getDoc as getFirestoreDoc, setDoc as setFirestoreDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp };

