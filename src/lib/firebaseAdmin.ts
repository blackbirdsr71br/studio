
import admin from 'firebase-admin';

// Load environment variables from .env file
require('dotenv').config();


let app: admin.app.App | undefined;
let isInitialized = false;

function initializeFirebaseAdmin() {
  if (isInitialized) {
    return;
  }
  isInitialized = true; 

  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    console.log('Firebase Admin SDK: Using existing app.');
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.warn(
      'Firebase Admin SDK: FIREBASE_SERVICE_ACCOUNT_JSON is not set. Remote Config publishing will be disabled.'
    );
    return;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK: Initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK: Error parsing service account JSON or initializing app:', error);
    app = undefined;
  }
}

// Initialize on module load
initializeFirebaseAdmin();

export const getRemoteConfig = (): admin.remoteConfig.RemoteConfig | undefined => {
  if (!app) {
    return undefined;
  }
  try {
    return admin.remoteConfig(app);
  } catch(e) {
    console.error("Failed to get remote config instance", e);
    return undefined;
  }
};

export const isAdminInitialized = (): boolean => {
  return !!app;
};
