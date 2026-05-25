

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import * as admin from 'firebase-admin';

// This is the service account JSON. In a real production app, you'd want
// to load this from a secure environment variable, not commit it to your repository.
// For this environment, it's configured to work automatically.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let firebaseAdminApp: admin.app.App;

/**
 * Initializes and returns a singleton instance of the Firebase Admin App.
 * This is safe to call from any server-side function or component.
 */
function getFirebaseAdminApp() {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  if (admin.apps.length > 0) {
    firebaseAdminApp = admin.app();
    return firebaseAdminApp;
  }
  
  if (!serviceAccount) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Cannot initialize Firebase Admin SDK.');
  }

  try {
    const credentials = JSON.parse(serviceAccount);
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      // The databaseURL is required for the Realtime Database, but it's good practice
      // to include it for Firestore as well, referencing your project ID.
      databaseURL: `https://${credentials.project_id}.firebaseio.com`,
      storageBucket: `${credentials.project_id}.appspot.com`
    });
    return firebaseAdminApp;
  } catch (e: any) {
    throw new Error(`Failed to parse Firebase service account credentials or initialize app: ${e.message}`);
  }
}

/**
 * Returns an initialized Firestore Admin instance.
 * Safe to call from server-side code.
 */
export function getFirestoreAdmin() {
  const app = getFirebaseAdminApp();
  return getFirestore(app);
}

/**
 * Returns an initialized Auth Admin instance.
 * Safe to call from server-side code.
 */
export function getAuthAdmin() {
    const app = getFirebaseAdminApp();
    return getAuth(app);
}

/**
 * Returns an initialized Storage Admin instance (default bucket).
 * Safe to call from server-side code.
 */
export function getStorageAdmin() {
    const app = getFirebaseAdminApp();
    return getStorage(app);
}
