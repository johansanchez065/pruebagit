import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { db, ensureAuth, subscribeWithAuth } from '../firebase/config';

export function normalizeShelfName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function shelvesCollection(jobId) {
  return collection(db, 'jobs', jobId, 'shelves');
}

// Deterministic from the normalized name: if two devices race to create the
// same brand-new shelf, both writes target the same document instead of
// producing two duplicate shelves.
function shelfRef(jobId, normalizedName) {
  return doc(shelvesCollection(jobId), encodeURIComponent(normalizedName));
}

export async function listShelves(jobId) {
  await ensureAuth();
  const snap = await getDocs(shelvesCollection(jobId));
  return snap.docs.map((d) => d.data());
}

export function subscribeShelves(jobId, callback) {
  return subscribeWithAuth(() =>
    onSnapshot(shelvesCollection(jobId), (snap) => {
      callback(snap.docs.map((d) => d.data()));
    }),
  );
}

// Returns the existing shelf for this job with a matching name (case/space
// insensitive) or creates a new one, so re-photographing the same shelf never
// produces a duplicate group.
export async function findOrCreateShelf(jobId, rawName) {
  await ensureAuth();
  const normalizedName = normalizeShelfName(rawName);
  const ref = shelfRef(jobId, normalizedName);
  const existing = await getDoc(ref);
  if (existing.exists()) return existing.data();

  const shelf = { id: ref.id, jobId, name: rawName.trim(), normalizedName, createdAt: Date.now() };
  await setDoc(ref, shelf);
  return shelf;
}

// Bulk version for large pasted/OCR imports: resolves every shelf name in
// parallel reads, then writes any brand-new shelves in chunked batches
// instead of one sequential round trip per row.
export async function resolveShelvesBulk(jobId, rawNames) {
  await ensureAuth();
  const uniqueNames = [...new Set(rawNames.map((n) => n.trim()))];
  const refs = uniqueNames.map((name) => ({ name, ref: shelfRef(jobId, normalizeShelfName(name)) }));
  const snaps = await Promise.all(refs.map(({ ref }) => getDoc(ref)));

  const byName = new Map();
  const toCreate = [];
  refs.forEach(({ name, ref }, i) => {
    const snap = snaps[i];
    if (snap.exists()) {
      byName.set(name, snap.data());
    } else {
      const shelf = { id: ref.id, jobId, name, normalizedName: normalizeShelfName(name), createdAt: Date.now() };
      byName.set(name, shelf);
      toCreate.push({ ref, shelf });
    }
  });

  for (let i = 0; i < toCreate.length; i += 450) {
    const batch = writeBatch(db);
    for (const { ref, shelf } of toCreate.slice(i, i + 450)) batch.set(ref, shelf);
    await batch.commit();
  }

  return byName;
}
