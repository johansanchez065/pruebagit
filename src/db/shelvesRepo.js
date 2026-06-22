import { getDb, newId } from './db';

export function normalizeShelfName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function listShelves(jobId) {
  const db = await getDb();
  return db.getAllFromIndex('shelves', 'jobId', jobId);
}

// Returns the existing shelf for this job with a matching name (case/space
// insensitive) or creates a new one, so re-photographing the same shelf never
// produces a duplicate group.
export async function findOrCreateShelf(jobId, rawName) {
  const db = await getDb();
  const normalizedName = normalizeShelfName(rawName);
  const existing = await db.getFromIndex('shelves', 'jobId_norm', [jobId, normalizedName]);
  if (existing) return existing;

  const shelf = {
    id: newId(),
    jobId,
    name: rawName.trim(),
    normalizedName,
    createdAt: Date.now(),
  };
  await db.add('shelves', shelf);
  return shelf;
}
