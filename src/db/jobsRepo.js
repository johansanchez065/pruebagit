import { getDb, deleteAllForJob, notifyJobChange, onJobChange } from './db';

export const JOB_TTL_MS = 48 * 60 * 60 * 1000;

// Jobs keep a short shareable code as their id (not a UUID) even though
// everything is local-only for now — this is the seam Modo Equipo will plug
// a synced backend into later without changing any UI, route, or QR code.
// Avoids 0/O/1/I so a code is never ambiguous read out loud or handwritten.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

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

export async function listRecentJobs() {
  const db = await getDb();
  const jobs = await db.getAll('jobs');
  return jobs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getJob(id) {
  const db = await getDb();
  return (await db.get('jobs', id)) || null;
}

export async function createJob(name) {
  const db = await getDb();
  let code;
  do {
    code = randomCode();
  } while (await db.get('jobs', code));

  const job = { id: code, name: name.trim(), createdAt: Date.now() };
  await db.add('jobs', job);
  return job;
}

// Looks up a job by its short code on this device's own storage. Today that
// only ever resolves a job this same phone already created — once Modo
// Equipo wires a real backend behind this function, a teammate's code will
// start resolving too, with no change needed in HomePage/JobPage.
export async function joinJob(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  return getJob(code);
}

export function subscribeJob(jobId, callback) {
  let cancelled = false;
  const load = () => {
    getJob(jobId).then((job) => {
      if (!cancelled) callback(job);
    });
  };
  load();
  const unsubscribe = onJobChange(jobId, load);
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function deleteJob(id) {
  const db = await getDb();
  await deleteAllForJob(db, 'shelves', id);
  await deleteAllForJob(db, 'products', id);
  await deleteAllForJob(db, 'photos', id);
  await deleteAllForJob(db, 'searchHistory', id);
  await db.delete('jobs', id);
  notifyJobChange(id);
}

export function expiresAt(job) {
  return job.createdAt + JOB_TTL_MS;
}

export function msRemaining(job) {
  return expiresAt(job) - Date.now();
}
