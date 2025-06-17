
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

// Log para depuración MUY IMPORTANTE
console.log("Firebase Client SDK: Initializing with config:", firebaseConfig);

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


// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

if (typeof window !== "undefined") { // Ensure this only runs on the client-side
  if (getApps().length === 0) {
    // Only initialize if projectId is somewhat valid to prevent further confusing errors,
    // though the SDK might still try and fail if it's a completely wrong ID.
    // The main check above should guide the user.
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  // @ts-ignore Type 'Firestore | undefined' is not assignable to type 'Firestore'
  db = getFirestore(app);
} else {
  // Handle server-side case if necessary, though db is mostly client-side here
  // For this app, db is primarily used client-side in DesignContext
  // Assign a placeholder or handle error if db is accessed server-side without init
  // For now, db might be undefined on server, which is fine if not used.
}

// @ts-ignore Export possibly undefined db, context using it should check
export { app, db };
