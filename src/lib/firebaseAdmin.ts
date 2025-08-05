import admin from 'firebase-admin';

const REMOTE_CONFIG_MAX_TEMPLATE_VERSIONS = 300; // Default limit, good to be aware of

let app: admin.app.App | undefined; // Allow app to be undefined initially

function initializeFirebaseAdmin() {
  console.log('Firebase Admin SDK: Attempting to initialize...');
  if (admin.apps.length) {
    app = admin.app();
    console.log('Firebase Admin SDK: Already initialized, using existing app.');
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.warn(
      'Firebase Admin SDK: FIREBASE_SERVICE_ACCOUNT_JSON is not set. Remote Config publishing will not work. Ensure it is correctly set in your .env.local file and the server was restarted.'
    );
    return;
  }
  console.log('Firebase Admin SDK: FIREBASE_SERVICE_ACCOUNT_JSON found.');

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('Firebase Admin SDK: Service account JSON parsed successfully.');
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK: Initialized successfully with provided credentials.');
  } catch (error) {
    console.error('Firebase Admin SDK: Error parsing service account JSON or initializing app:', error);
    app = undefined; // Ensure app is undefined on error
  }
}

initializeFirebaseAdmin();

export const getFirebaseAdminApp = (): admin.app.App | undefined => {
  if (!app && admin.apps.length > 0) {
    console.log('Firebase Admin SDK: getFirebaseAdminApp - app was not set, but admin.apps has entries. Using admin.app().');
    return admin.app();
  }
  if (!app) {
     console.log('Firebase Admin SDK: getFirebaseAdminApp - app is not set and no admin.apps entries. Attempting re-initialization.');
     // This might happen if env vars were loaded late or something else went wrong.
     // Only attempt re-init if it seems like it never got a chance.
     if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        console.warn('Firebase Admin SDK: getFirebaseAdminApp - Cannot re-initialize, FIREBASE_SERVICE_ACCOUNT_JSON still not found.');
     } else if (admin.apps.length === 0) { // Only if no apps are initialized at all.
        initializeFirebaseAdmin(); // Try one more time
     }
  }
  console.log(`Firebase Admin SDK: getFirebaseAdminApp - Returning app instance (isDefined: ${!!app})`);
  return app;
};

export const getRemoteConfig = (): admin.remoteConfig.RemoteConfig | undefined => {
  const currentApp = getFirebaseAdminApp();
  if (!currentApp) {
    console.warn('Firebase Admin SDK: getRemoteConfig - Firebase Admin App not initialized. Remote Config operations will fail.');
    return undefined;
  }
  console.log('Firebase Admin SDK: getRemoteConfig - Returning Remote Config instance.');
  return admin.remoteConfig(currentApp);
};

export const isAdminInitialized = (): boolean => {
  const initialized = !!getFirebaseAdminApp();
  console.log(`Firebase Admin SDK: isAdminInitialized - Returning: ${initialized}`);
  return initialized;
};