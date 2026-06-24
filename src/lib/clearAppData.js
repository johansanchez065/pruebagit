import { DB_NAME } from '../db/db';

// Temporary testing aid: wipes everything the app stores on this device —
// IndexedDB jobs/products, localStorage (name + language), the PWA's
// CacheStorage entries, and the registered service worker — then reloads so
// the next load is guaranteed to fetch fresh from the network instead of
// quietly reusing whatever this phone had cached.
export async function clearAllAppData() {
  try {
    localStorage.clear();
  } catch {
    // ignore — private mode etc.
  }

  try {
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = resolve;
      req.onerror = resolve;
      req.onblocked = resolve;
    });
  } catch {
    // ignore
  }

  if (window.caches) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // ignore
    }
  }

  if (navigator.serviceWorker) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    } catch {
      // ignore
    }
  }

  window.location.reload();
}
