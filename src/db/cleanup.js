import { JOB_TTL_MS, deleteJob, listRecentJobs } from './jobsRepo';

// Sweeps every job this device knows about (created or joined) that's older
// than 48h and cascades the delete to its shelves and products. There is no
// manual "finish job" action by design — the user only ever creates jobs,
// and the app forgets them on its own. Jobs live in a shared Firestore
// collection now, so this intentionally only ever touches jobs this device
// has in its local recents list, never the whole collection.
export async function purgeExpiredJobs() {
  const now = Date.now();
  const expired = listRecentJobs().filter((job) => now - job.createdAt > JOB_TTL_MS);
  for (const job of expired) {
    await deleteJob(job.id);
  }
  return expired.map((job) => job.id);
}

let intervalHandle = null;

// Runs the sweep immediately, then on an interval and whenever the tab
// regains focus (the most likely moment for a job to have just crossed the
// 48h line while the phone was asleep in a pocket).
export function startCleanupScheduler({ intervalMs = 60_000, onPurge } = {}) {
  const run = async () => {
    const purgedIds = await purgeExpiredJobs();
    if (purgedIds.length && onPurge) onPurge(purgedIds);
  };

  run();
  intervalHandle = setInterval(run, intervalMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run();
  });

  return () => {
    if (intervalHandle) clearInterval(intervalHandle);
  };
}
