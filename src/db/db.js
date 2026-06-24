import { openDB } from 'idb';

export const DB_NAME = 'shelf-finder-db';
export const DB_VERSION = 2;

let dbPromise = null;

// v1 (jobs/shelves/products) is what's already on real devices from the
// first release — upgrade() only ever adds stores/indexes on top of it so
// nobody's in-progress job gets wiped by this update.
export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const jobs = database.createObjectStore('jobs', { keyPath: 'id' });
          jobs.createIndex('createdAt', 'createdAt');

          const shelves = database.createObjectStore('shelves', { keyPath: 'id' });
          shelves.createIndex('jobId', 'jobId');
          shelves.createIndex('jobId_norm', ['jobId', 'normalizedName'], { unique: true });

          const products = database.createObjectStore('products', { keyPath: 'id' });
          products.createIndex('jobId', 'jobId');
          products.createIndex('shelfId', 'shelfId');
          products.createIndex('jobId_upc', ['jobId', 'upc']);
        }

        if (oldVersion < 2) {
          const photos = database.createObjectStore('photos', { keyPath: 'id' });
          photos.createIndex('jobId', 'jobId');

          const searchHistory = database.createObjectStore('searchHistory', { keyPath: 'id' });
          searchHistory.createIndex('jobId', 'jobId');
        }
      },
    });
  }
  return dbPromise;
}

export function newId() {
  return crypto.randomUUID();
}

// Lightweight per-job pub/sub so screens subscribed to a job feel "live"
// the moment any repo function writes to it, without needing a real backend
// — this is the seam Modo Equipo will later plug a synced backend into.
const jobListeners = new Map();

export function notifyJobChange(jobId) {
  jobListeners.get(jobId)?.forEach((fn) => fn());
}

export function onJobChange(jobId, fn) {
  if (!jobListeners.has(jobId)) jobListeners.set(jobId, new Set());
  jobListeners.get(jobId).add(fn);
  return () => {
    const set = jobListeners.get(jobId);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) jobListeners.delete(jobId);
  };
}

// Deletes every record in `storeName` for this job — the shared cascade used
// when a job is deleted or expires, across shelves/products/photos/history.
export async function deleteAllForJob(db, storeName, jobId) {
  const tx = db.transaction(storeName, 'readwrite');
  const keys = await tx.store.index('jobId').getAllKeys(jobId);
  await Promise.all(keys.map((key) => tx.store.delete(key)));
  await tx.done;
}
