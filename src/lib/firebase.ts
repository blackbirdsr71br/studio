
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

// Initialize Firebase App and Firestore
let app: FirebaseApp;
let db: Firestore;

// This function can be called on both server and client.
// It ensures that initialization happens only once.
const initializeFirebase = () => {
    if (getApps().length === 0) {
        if (!firebaseConfig.projectId || firebaseConfig.projectId === "your-project-id") {
            // This check is crucial. If there's no projectId, don't even attempt to initialize.
            console.error("Firebase initialization skipped: Project ID is missing or is a placeholder. Please update .env with your Firebase project's credentials.");
            return;
        }
        try {
            app = initializeApp(firebaseConfig);
            console.log("Firebase Client SDK: App initialized successfully.");
        } catch (e) {
            console.error("Firebase Client SDK: Error initializing app.", e);
        }
    } else {
        app = getApps()[0];
        // console.log("Firebase Client SDK: Using existing app instance.");
    }

    if (app) {
        try {
            db = getFirestore(app);
        } catch (e) {
            console.error("Firebase Client SDK: Error getting Firestore instance.", e);
        }
    }
};

// Run the initialization logic.
initializeFirebase();

// Export the instances. They might be undefined if initialization failed.
// Code using `db` should handle this possibility, especially in client components
// where they might be rendered before the context provider has fully loaded data.
export { app, db };
