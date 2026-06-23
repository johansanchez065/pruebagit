import { getDb, newId } from './db';

const HISTORY_LIMIT = 10;

export async function listSearchHistory(jobId) {
  const db = await getDb();
  const entries = await db.getAllFromIndex('searchHistory', 'jobId', jobId);
  return entries.sort((a, b) => b.createdAt - a.createdAt).slice(0, HISTORY_LIMIT);
}

// Snapshots the product's display fields at search time (not a live
// reference), so the history still reads correctly even if the product is
// later edited or deleted. Trims anything past the last 10 right after.
export async function recordSearch(jobId, product, shelfName) {
  const db = await getDb();
  const entry = {
    id: newId(),
    jobId,
    description: product.description,
    upc: product.upc,
    shelfName: shelfName || '',
    position: product.position || '',
    createdAt: Date.now(),
  };
  await db.add('searchHistory', entry);

  const all = await db.getAllFromIndex('searchHistory', 'jobId', jobId);
  const stale = all.sort((a, b) => b.createdAt - a.createdAt).slice(HISTORY_LIMIT);
  await Promise.all(stale.map((e) => db.delete('searchHistory', e.id)));

  return entry;
}
