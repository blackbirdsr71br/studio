
import admin from 'firebase-admin';

let app: admin.app.App | undefined;

function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent re-initialization
  if (admin.apps.length) {
    app = admin.app();
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

export const getFirebaseAdminApp = (): admin.app.App | undefined => {
  return app;
};

export const getRemoteConfig = (): admin.remoteConfig.RemoteConfig | undefined => {
  if (!app) {
    console.warn('Firebase Admin SDK: App not initialized. Cannot get Remote Config instance.');
    return undefined;
  }
  return admin.remoteConfig(app);
};

export const isAdminInitialized = (): boolean => {
  return !!app;
};
