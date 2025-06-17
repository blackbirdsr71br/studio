
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

// Log para depuración
console.log("Firebase Config Used by Client SDK:", firebaseConfig);
if (!firebaseConfig.projectId || firebaseConfig.projectId.trim() === "") {
  console.error(
    "CRITICAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set or is empty. " +
    "Firestore operations will likely fail with a 400 error due to a malformed database URL. " +
    "Please ensure this variable is correctly set in your .env (or .env.local) file and restart your development server."
  );
}


// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);

export { app, db };

