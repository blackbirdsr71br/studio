// IMPORTANT: This line MUST be the first thing executed to ensure env vars are loaded for the server.
require('dotenv').config();

import admin from 'firebase-admin';

let app: admin.app.App;

// This self-invoking function ensures that the Admin SDK is initialized only once.
(function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    console.log('Firebase Admin SDK: Using existing app.');
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.warn(
      'Firebase Admin SDK Initialization SKIPPED: The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. Remote Config features will be disabled.'
    );
    return;
  }

  try {
    // We must parse the JSON string from the environment variable into an object.
    const serviceAccount = JSON.parse(serviceAccountJson);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK: Initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK Initialization FAILED: Could not parse service account JSON or initialize app.', error);
  }
})();


export const getRemoteConfig = (): admin.remoteConfig.RemoteConfig | null => {
  if (!app) {
    console.warn("Cannot get Remote Config: Firebase Admin SDK is not initialized.");
    return null;
  }
  try {
    return admin.remoteConfig(app);
  } catch(e) {
    console.error("Failed to get Remote Config instance", e);
    return null;
  }
};

export const isAdminInitialized = (): boolean => {
  return !!app;
};
