
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration will be populated from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase App and Firestore
let app: FirebaseApp | undefined;
let db: Firestore | undefined;

// This function can be called on both server and client.
// It ensures that initialization happens only once.
const initializeFirebase = () => {
    if (!firebaseConfig.projectId || firebaseConfig.projectId === "your-project-id") {
      console.error(
        "Firebase initialization skipped: Project ID is missing or is a placeholder. " +
        "Please ensure your .env file is correctly set up with NEXT_PUBLIC_FIREBASE_PROJECT_ID."
      );
      return;
    }

    if (getApps().length === 0) {
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            // console.log("Firebase Client SDK: App initialized successfully.");
        } catch (e) {
            console.error("Firebase Client SDK: Error initializing app.", e);
        }
    } else {
        app = getApps()[0];
        if (!db) {
          db = getFirestore(app);
        }
        // console.log("Firebase Client SDK: Using existing app instance.");
    }
};

// Run the initialization logic.
initializeFirebase();

// Export the instances. They might be undefined if initialization failed.
// Code using `db` should handle this possibility.
export { app, db };
