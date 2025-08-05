
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// These will be populated from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Log for debugging - VERY IMPORTANT for client-side issues
if (typeof window !== 'undefined') {
  console.log("Firebase Client SDK: Initializing with config:", {
      ...firebaseConfig,
      apiKey: firebaseConfig.apiKey ? '***' : undefined
  });

  if (!firebaseConfig.projectId || firebaseConfig.projectId.trim() === "") {
    console.error(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
      "CRITICAL FIREBASE CONFIGURATION ERROR:\n" +
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or empty.\n" +
      "This WILL cause Firestore operations to fail with an HTTP 400 error.\n" +
      "The database URL will be malformed (e.g., 'projects//databases/(default)').\n" +
      "Please verify this variable in your .env.local file and RESTART your dev server.\n" +
      "Example: NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-actual-project-id\n" +
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    );
  } else {
    console.log("Firebase Client SDK: NEXT_PUBLIC_FIREBASE_PROJECT_ID appears to be set:", firebaseConfig.projectId);
  }
}

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

if (getApps().length === 0) {
  if (!firebaseConfig.projectId) {
    console.error("Firebase initialization skipped: projectId is missing.");
    // Assign dummy objects to prevent crashes if code proceeds
    app = {} as FirebaseApp;
    db = {} as Firestore;
  } else {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
}

export { app, db };
