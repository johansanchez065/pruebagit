import { openDB } from 'idb';

export const DB_NAME = 'shelf-finder-db';
export const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const jobs = db.createObjectStore('jobs', { keyPath: 'id' });
        jobs.createIndex('createdAt', 'createdAt');

        const shelves = db.createObjectStore('shelves', { keyPath: 'id' });
        shelves.createIndex('jobId', 'jobId');
        shelves.createIndex('jobId_norm', ['jobId', 'normalizedName'], { unique: true });

        const products = db.createObjectStore('products', { keyPath: 'id' });
        products.createIndex('jobId', 'jobId');
        products.createIndex('shelfId', 'shelfId');
        products.createIndex('jobId_upc', ['jobId', 'upc']);
      },
    });
  }
  return dbPromise;
}

export function newId() {
  return crypto.randomUUID();
}
