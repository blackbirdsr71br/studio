
import admin from 'firebase-admin';

const REMOTE_CONFIG_MAX_TEMPLATE_VERSIONS = 300; // Default limit, good to be aware of

let app: admin.app.App;

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    app = admin.app();
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.warn(
      'Firebase Admin SDK: FIREBASE_SERVICE_ACCOUNT_JSON is not set. Remote Config publishing will not work.'
    );
    // Allow app to run, but features requiring admin will fail gracefully in their respective actions.
    return;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK: Error parsing service account JSON or initializing app:', error);
    // Prevent app from crashing, but log the critical error.
  }
}

initializeFirebaseAdmin();

export const getFirebaseAdminApp = (): admin.app.App | undefined => {
  if (!app && admin.apps.length > 0) {
     // If initializeFirebaseAdmin was called but app wasn't set (e.g. due to missing creds initially but then added)
     // and an app now exists (e.g. from another part of Genkit or auto-init), try to use it.
    return admin.app();
  }
  return app;
};

export const getRemoteConfig = (): admin.remoteConfig.RemoteConfig | undefined => {
  const currentApp = getFirebaseAdminApp();
  if (!currentApp) {
    // console.warn('Firebase Admin App not initialized. Remote Config operations will fail.');
    return undefined;
  }
  return admin.remoteConfig(currentApp);
};

// You can add a helper to check initialization status if needed elsewhere
export const isAdminInitialized = (): boolean => !!getFirebaseAdminApp();
