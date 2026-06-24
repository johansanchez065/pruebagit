import { getDb, newId, notifyJobChange, onJobChange } from './db';
import { normalizeUpc, upcVariants } from '../lib/upc';

// Older local records (from before this field set existed) only ever had
// {id, jobId, shelfId, name, upc, createdAt} — this fills in every new field
// with a sane default so the rest of the app can always read the full shape,
// regardless of how old the record is.
function normalizeProduct(p) {
  const description = p.description ?? p.name ?? '';
  return {
    position: '',
    stockcode: '',
    size: '',
    uom: '',
    facings: '',
    status: 'pending',
    updatedBy: null,
    updatedAt: null,
    ...p,
    description,
    name: description,
  };
}

export async function listProducts(jobId) {
  const db = await getDb();
  const products = await db.getAllFromIndex('products', 'jobId', jobId);
  return products.map(normalizeProduct);
}

export function subscribeProducts(jobId, callback) {
  let cancelled = false;
  const load = () => {
    listProducts(jobId).then((products) => {
      if (!cancelled) callback(products);
    });
  };
  load();
  const unsubscribe = onJobChange(jobId, load);
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function addProduct({ jobId, shelfId, description, upc, position, stockcode, size, uom, facings }) {
  const db = await getDb();
  const product = {
    id: newId(),
    jobId,
    shelfId,
    description: (description || '').trim(),
    upc: normalizeUpc(upc),
    position: (position ?? '').toString().trim(),
    stockcode: (stockcode ?? '').toString().trim(),
    size: (size ?? '').toString().trim(),
    uom: (uom ?? '').toString().trim(),
    facings: (facings ?? '').toString().trim(),
    status: 'pending',
    updatedBy: null,
    updatedAt: null,
    createdAt: Date.now(),
  };
  await db.add('products', product);
  notifyJobChange(jobId);
  return normalizeProduct(product);
}

export async function updateProduct(jobId, id, changes) {
  const db = await getDb();
  const existing = await db.get('products', id);
  if (!existing) return null;
  const patch = { ...changes };
  if (patch.description !== undefined) patch.description = patch.description.trim();
  if (patch.upc !== undefined) patch.upc = normalizeUpc(patch.upc);
  const updated = { ...existing, ...patch };
  await db.put('products', updated);
  notifyJobChange(jobId);
  return normalizeProduct(updated);
}

// 1-tap status marking: records who and when, without touching the rest of
// the product. Passing `status: null` clears it back to pending.
export async function setProductStatus(jobId, id, status, by) {
  const db = await getDb();
  const existing = await db.get('products', id);
  if (!existing) return null;
  const updated =
    status === null
      ? { ...existing, status: 'pending', updatedBy: null, updatedAt: null }
      : { ...existing, status, updatedBy: by, updatedAt: Date.now() };
  await db.put('products', updated);
  notifyJobChange(jobId);
  return normalizeProduct(updated);
}

export async function deleteProduct(jobId, id) {
  const db = await getDb();
  await db.delete('products', id);
  notifyJobChange(jobId);
}

// Bulk version for large pasted/OCR imports — adds every row in one
// transaction instead of one round trip per row, so a 1000+ row import
// stays fast.
export async function addProductsBulk(jobId, items) {
  const db = await getDb();
  const tx = db.transaction('products', 'readwrite');
  const now = Date.now();
  const products = items.map((item) => ({
    id: newId(),
    jobId,
    shelfId: item.shelfId,
    description: (item.description || '').trim(),
    upc: normalizeUpc(item.upc),
    position: (item.position ?? '').toString().trim(),
    stockcode: (item.stockcode ?? '').toString().trim(),
    size: (item.size ?? '').toString().trim(),
    uom: (item.uom ?? '').toString().trim(),
    facings: (item.facings ?? '').toString().trim(),
    status: 'pending',
    updatedBy: null,
    updatedAt: null,
    createdAt: now,
  }));
  await Promise.all(products.map((product) => tx.store.add(product)));
  await tx.done;
  notifyJobChange(jobId);
  return products.map(normalizeProduct);
}

// Tries an exact match first, then falls back to UPC-A/EAN-13 leading-zero
// variants so a scan still resolves even if the printed sheet used the other
// numbering convention.
export async function findByUpc(jobId, rawUpc) {
  const db = await getDb();
  for (const variant of upcVariants(rawUpc)) {
    const match = await db.getFromIndex('products', 'jobId_upc', [jobId, variant]);
    if (match) return normalizeProduct(match);
  }
  return null;
}
