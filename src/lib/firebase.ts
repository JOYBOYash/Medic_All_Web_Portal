// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
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
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // if (firebaseConfig.measurementId) {
  //   getAnalytics(app);
  // }
} else if (typeof window !== 'undefined') {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // Handle server-side initialization if needed, though client-side is typical for auth/firestore UI
  // For server actions or API routes, you might use Firebase Admin SDK
}

// Exporting as potentially undefined for server components where they might not be initialized
export { app, auth, db };
