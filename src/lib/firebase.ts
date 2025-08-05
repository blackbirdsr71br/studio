import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// This object will hold the single instance of our Firebase app
let app: FirebaseApp;

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

try {
    // Check if any apps are already initialized
    if (!getApps().length) {
        // If no apps are initialized, initialize a new one
        app = initializeApp(firebaseConfig);
        console.log("Firebase Client SDK: New app initialized successfully.");
    } else {
        // If an app is already initialized, use the existing one
        app = getApp();
        console.log("Firebase Client SDK: Using existing app instance.");
    }
} catch (error) {
    console.error("Firebase Client SDK: Critical initialization error.", error);
    // In case of a critical error, we might not have a valid app instance.
    // Subsequent calls to getFirebaseDb might fail.
}


// This promise will resolve with the Firestore instance once available.
let dbPromise: Promise<Firestore | null> | null = null;

export const getFirebaseDb = (): Promise<Firestore | null> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve) => {
        if (!firebaseConfig.projectId) {
            console.error(
                "Firebase initialization skipped: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. " +
                "Please ensure your .env file is correctly set up."
            );
            resolve(null);
            return;
        }
        
        // At this point, `app` should be initialized from the logic above.
        if (app) {
            resolve(getFirestore(app));
        } else {
            console.error("Firebase app instance is not available. Cannot get Firestore.");
            resolve(null);
        }
    });

    return dbPromise;
};
