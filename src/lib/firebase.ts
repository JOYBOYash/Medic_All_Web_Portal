
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, orderBy, limit, writeBatch } from 'firebase/firestore'; // Added writeBatch
// import { getAnalytics } from "firebase/analytics"; // Optional

// Your web app's Firebase configuration
// IMPORTANT: These will be loaded from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Ensure Firebase is initialized only on the client side and only once.
if (typeof window !== 'undefined') {
  if (!getApps().length) {
    if (
        firebaseConfig.apiKey && firebaseConfig.apiKey !== "your-api-key" &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId
    ) {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            // if (firebaseConfig.measurementId && process.env.NODE_ENV === 'production') {
            //   getAnalytics(app);
            // }
        } catch (error) {
            console.error("Firebase initialization error:", error);
        }
    } else {
        console.warn("Firebase configuration is missing or incomplete. Using placeholder values. Please update your .env.local file.");
        // Provide default placeholder config to avoid app crash if no env vars
        const placeholderConfig = {
            apiKey: "your-api-key",
            authDomain: "your-auth-domain.firebaseapp.com",
            projectId: "your-project-id",
            storageBucket: "your-project-id.appspot.com",
            messagingSenderId: "your-sender-id",
            appId: "your-app-id"
        };
        app = initializeApp(placeholderConfig); // Initialize with placeholders
        auth = getAuth(app);
        db = getFirestore(app);
    }
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }
} else {
  // Server-side or environment where window is not defined
  // Handle initialization differently or ensure these are not called server-side without proper checks
  // For this app structure (client-heavy), client-side init is primary.
  // If you need server-side Firebase Admin, that's a separate setup.
}


export { app, auth, db };

export const USERS_COLLECTION = "users";
export const PATIENTS_COLLECTION = "patients";
export const MEDICINES_COLLECTION = "medicines";
export const APPOINTMENTS_COLLECTION = "appointments";

export const createUserProfileDocument = async (userId: string, data: { email: string | null, role: 'doctor' | 'patient', displayName?: string | null, photoURL?: string | null }) => {
  if (!db || !userId) return; // Check if db is initialized
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const userProfileData = {
    uid: userId,
    ...data,
    createdAt: serverTimestamp(),
  };
  try {
    await setFirestoreDoc(userDocRef, userProfileData);
    return userProfileData;
  } catch (error) {
    console.error("Error creating user profile document: ", error);
    throw error;
  }
};

export const getUserProfileDocument = async (userId: string) => {
  if (!db || !userId) return null; // Check if db is initialized
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  try {
    const docSnap = await getFirestoreDoc(userDocRef);
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

// Explicitly re-export Firestore functions for use in other parts of the app
export { collection, addDoc, getDocs, query, where, doc, getDoc as getFirestoreDoc, setDoc as setFirestoreDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, orderBy, limit, writeBatch };
