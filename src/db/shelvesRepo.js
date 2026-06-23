import { getDb, newId, notifyJobChange, onJobChange } from './db';

export function normalizeShelfName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function listShelves(jobId) {
  const db = await getDb();
  return db.getAllFromIndex('shelves', 'jobId', jobId);
}

export function subscribeShelves(jobId, callback) {
  let cancelled = false;
  const load = () => {
    listShelves(jobId).then((shelves) => {
      if (!cancelled) callback(shelves);
    });
  };
  load();
  const unsubscribe = onJobChange(jobId, load);
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

// Returns the existing shelf for this job with a matching name (case/space
// insensitive) or creates a new one, so re-photographing the same shelf never
// produces a duplicate group.
export async function findOrCreateShelf(jobId, rawName) {
  const db = await getDb();
  const normalizedName = normalizeShelfName(rawName);
  const existing = await db.getFromIndex('shelves', 'jobId_norm', [jobId, normalizedName]);
  if (existing) return existing;

  const shelf = { id: newId(), jobId, name: rawName.trim(), normalizedName, createdAt: Date.now() };
  await db.add('shelves', shelf);
  notifyJobChange(jobId);
  return shelf;
}

// Bulk version for large pasted/OCR imports: resolves every shelf name
// against what already exists, then only creates the ones that are new — so
// re-importing a sheet for a shelf that's already there just adds to it
// instead of creating a duplicate.
export async function resolveShelvesBulk(jobId, rawNames) {
  const db = await getDb();
  const uniqueNames = [...new Set(rawNames.map((n) => n.trim()))];
  const byName = new Map();

  for (const name of uniqueNames) {
    const normalizedName = normalizeShelfName(name);
    const existing = await db.getFromIndex('shelves', 'jobId_norm', [jobId, normalizedName]);
    if (existing) {
      byName.set(name, existing);
    } else {
      const shelf = { id: newId(), jobId, name, normalizedName, createdAt: Date.now() };
      await db.add('shelves', shelf);
      byName.set(name, shelf);
    }
  }

  notifyJobChange(jobId);
  return byName;
}
