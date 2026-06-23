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
    }).catch((err) => {
      // Without this, one failed sign-in (bad config, a momentary signal
      // drop) would permanently wedge every future call on this dead promise
      // — clearing the cache lets the next call retry from scratch.
      authReady = null;
      throw err;
    });
  }
  return authReady;
}

// Wraps a realtime listener so a failed/blip'd auth doesn't leave the screen
// stuck on its initial loading state forever — it keeps retrying until the
// subscription is cancelled (component unmount) or it finally succeeds.
export function subscribeWithAuth(attach) {
  let unsubscribe = () => {};
  let cancelled = false;
  let retryTimer = null;

  const attempt = () => {
    ensureAuth()
      .then(() => {
        if (cancelled) return;
        unsubscribe = attach();
      })
      .catch(() => {
        if (cancelled) return;
        retryTimer = setTimeout(attempt, 3000);
      });
  };
  attempt();

  return () => {
    cancelled = true;
    clearTimeout(retryTimer);
    unsubscribe();
  };
}
