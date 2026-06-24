import { getDb } from './db';
import { JOB_TTL_MS, deleteJob } from './jobsRepo';

// Sweeps every job on this device older than 48h and cascades the delete to
// its shelves, products, photos and search history. There is no manual
// "finish job" action by design — the user only ever creates jobs, and the
// app forgets them on its own.
export async function purgeExpiredJobs() {
  const db = await getDb();
  const now = Date.now();
  const jobs = await db.getAll('jobs');
  const expired = jobs.filter((job) => now - job.createdAt > JOB_TTL_MS);

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
