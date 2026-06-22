import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

// This is the public web config for a Firebase project, meant to ship inside
// client bundles (it is not a secret). Replace these placeholders with the
// values from your Firebase Console → Project settings → "Your apps" → Web app.
// Real access control lives in Firestore Security Rules, not in hiding this object.
const firebaseConfig = {
  apiKey: 'REPLACE_WITH_API_KEY',
  authDomain: 'REPLACE_WITH_PROJECT.firebaseapp.com',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_PROJECT.appspot.com',
  messagingSenderId: 'REPLACE_WITH_SENDER_ID',
  appId: 'REPLACE_WITH_APP_ID',
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const auth = getAuth(app);

let authReady = null;

// Anonymous sign-in exists only to satisfy Firestore's `request.auth != null`
// security rule. There is no login screen, no password, and no profile tied
// to this — it's silent and happens once per device.
export function ensureAuth() {
  if (!authReady) {
    authReady = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsubscribe();
            resolve(user);
          }
        },
        reject,
      );
      signInAnonymously(auth).catch(reject);
    });
  }
  return authReady;
}
