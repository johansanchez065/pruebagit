import { getDb } from './db';
import { JOB_TTL_MS } from './jobsRepo';

// Sweeps every job older than 48h and cascades the delete to its shelves and
// products. There is no manual "finish job" action by design — the user only
// ever creates jobs, and the app forgets them on its own.
export async function purgeExpiredJobs() {
  const db = await getDb();
  const now = Date.now();
  const jobs = await db.getAll('jobs');
  const expired = jobs.filter((job) => now - job.createdAt > JOB_TTL_MS);

  for (const job of expired) {
    const tx = db.transaction(['jobs', 'shelves', 'products'], 'readwrite');
    const shelfKeys = await tx.objectStore('shelves').index('jobId').getAllKeys(job.id);
    const productKeys = await tx.objectStore('products').index('jobId').getAllKeys(job.id);
    await Promise.all([
      ...shelfKeys.map((key) => tx.objectStore('shelves').delete(key)),
      ...productKeys.map((key) => tx.objectStore('products').delete(key)),
      tx.objectStore('jobs').delete(job.id),
    ]);
    await tx.done;
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
