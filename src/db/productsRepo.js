import { getDb, newId } from './db';
import { normalizeUpc, upcVariants } from '../lib/upc';

export async function listProducts(jobId) {
  const db = await getDb();
  return db.getAllFromIndex('products', 'jobId', jobId);
}

export async function addProduct({ jobId, shelfId, name, upc }) {
  const db = await getDb();
  const product = {
    id: newId(),
    jobId,
    shelfId,
    name: name.trim(),
    upc: normalizeUpc(upc),
    createdAt: Date.now(),
  };
  await db.add('products', product);
  return product;
}

export async function updateProduct(id, changes) {
  const db = await getDb();
  const product = await db.get('products', id);
  if (!product) return null;
  const updated = {
    ...product,
    ...changes,
    name: changes.name !== undefined ? changes.name.trim() : product.name,
    upc: changes.upc !== undefined ? normalizeUpc(changes.upc) : product.upc,
  };
  await db.put('products', updated);
  return updated;
}

export async function deleteProduct(id) {
  const db = await getDb();
  await db.delete('products', id);
}

// Tries an exact match first, then falls back to UPC-A/EAN-13 leading-zero
// variants so a scan still resolves even if the printed sheet used the other
// numbering convention.
export async function findByUpc(jobId, rawUpc) {
  const db = await getDb();
  for (const variant of upcVariants(rawUpc)) {
    const match = await db.getFromIndex('products', 'jobId_upc', [jobId, variant]);
    if (match) return match;
  }
  return null;
}
