import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, ensureAuth } from '../firebase/config';

export const JOB_TTL_MS = 48 * 60 * 60 * 1000;

// Avoids 0/O/1/I so a code is never ambiguous when a teammate reads it out
// loud or types it from a handwritten note.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const RECENTS_KEY = 'shelf-finder-recent-jobs';
const RECENTS_LIMIT = 30;

function randomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function normalizeCode(raw) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function jobRef(jobId) {
  return doc(db, 'jobs', jobId);
}

function readRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function rememberJob(job) {
  try {
    const recents = readRecents().filter((j) => j.id !== job.id);
    recents.unshift({ id: job.id, name: job.name, createdAt: job.createdAt });
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, RECENTS_LIMIT)));
  } catch {
    // localStorage can be unavailable (private mode, quota) — the recents
    // list is just a convenience cache, never the source of truth.
  }
}

function forgetJob(jobId) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(readRecents().filter((j) => j.id !== jobId)));
  } catch {
    // see rememberJob
  }
}

// The Home screen's job list: a local cache of jobs this device created or
// joined. Actual job/shelf/product data always lives in Firestore — this is
// only so the device remembers which codes to show without a global query.
export function listRecentJobs() {
  return readRecents().sort((a, b) => b.createdAt - a.createdAt);
}

export async function getJob(id) {
  await ensureAuth();
  const snap = await getDoc(jobRef(id));
  return snap.exists() ? snap.data() : null;
}

export async function createJob(name) {
  await ensureAuth();
  let code;
  // Collision odds are astronomically low (33^6 ≈ 1.29 billion combinations),
  // but two devices could create a job at the same instant, so check anyway.
  do {
    code = randomCode();
  } while ((await getDoc(jobRef(code))).exists());

  const job = { id: code, name: name.trim(), createdAt: Date.now() };
  await setDoc(jobRef(code), job);
  rememberJob(job);
  return job;
}

// Looks up a job by the short code a teammate shares, so a second phone can
// view/edit the exact same job instead of re-entering its products.
export async function joinJob(rawCode) {
  await ensureAuth();
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const snap = await getDoc(jobRef(code));
  if (!snap.exists()) return null;
  const job = snap.data();
  rememberJob(job);
  return job;
}

export function subscribeJob(jobId, callback) {
  let unsubscribe = () => {};
  let cancelled = false;
  ensureAuth().then(() => {
    if (cancelled) return;
    unsubscribe = onSnapshot(jobRef(jobId), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  });
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

async function deleteSubcollection(jobId, name) {
  const snap = await getDocs(collection(db, 'jobs', jobId, name));
  const refs = snap.docs.map((d) => d.ref);
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + 450)) batch.delete(ref);
    await batch.commit();
  }
}

export async function deleteJob(id) {
  await ensureAuth();
  await deleteSubcollection(id, 'products');
  await deleteSubcollection(id, 'shelves');
  await deleteDoc(jobRef(id));
  forgetJob(id);
}

export function expiresAt(job) {
  return job.createdAt + JOB_TTL_MS;
}

export function msRemaining(job) {
  return expiresAt(job) - Date.now();
}
