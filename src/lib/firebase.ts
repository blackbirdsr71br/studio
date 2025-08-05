
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// This promise will resolve with the Firestore instance once initialized.
let dbPromise: Promise<Firestore | null> | null = null;

// This function can be called on both server and client.
// It ensures that initialization happens only once and returns a promise.
export const getFirebaseDb = (): Promise<Firestore | null> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve) => {
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        };

        if (!firebaseConfig.projectId) {
            console.error(
                "Firebase initialization skipped: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. " +
                "Please ensure your .env file is correctly set up."
            );
            resolve(null);
            return;
        }

        let app: FirebaseApp;
        if (getApps().length === 0) {
            try {
                app = initializeApp(firebaseConfig);
                // console.log("Firebase Client SDK: App initialized successfully.");
            } catch (e) {
                console.error("Firebase Client SDK: Error initializing app.", e);
                resolve(null);
                return;
            }
        } else {
            app = getApps()[0];
            // console.log("Firebase Client SDK: Using existing app instance.");
        }
        
        resolve(getFirestore(app));
    });

    return dbPromise;
};


    
