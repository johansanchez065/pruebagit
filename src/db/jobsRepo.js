import { getDb, newId } from './db';

export const JOB_TTL_MS = 48 * 60 * 60 * 1000;

export async function listJobs() {
  const db = await getDb();
  const jobs = await db.getAll('jobs');
  return jobs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getJob(id) {
  const db = await getDb();
  return db.get('jobs', id);
}

export async function createJob(name) {
  const db = await getDb();
  const job = {
    id: newId(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  await db.add('jobs', job);
  return job;
}

export async function deleteJob(id) {
  const db = await getDb();
  const tx = db.transaction(['jobs', 'shelves', 'products'], 'readwrite');
  const shelfKeys = await tx.objectStore('shelves').index('jobId').getAllKeys(id);
  const productKeys = await tx.objectStore('products').index('jobId').getAllKeys(id);
  await Promise.all([
    ...shelfKeys.map((key) => tx.objectStore('shelves').delete(key)),
    ...productKeys.map((key) => tx.objectStore('products').delete(key)),
    tx.objectStore('jobs').delete(id),
  ]);
  await tx.done;
}

export function expiresAt(job) {
  return job.createdAt + JOB_TTL_MS;
}

export function msRemaining(job) {
  return expiresAt(job) - Date.now();
}
