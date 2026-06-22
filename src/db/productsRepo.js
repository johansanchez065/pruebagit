import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { db, ensureAuth } from '../firebase/config';
import { normalizeUpc, upcVariants } from '../lib/upc';

function productsCollection(jobId) {
  return collection(db, 'jobs', jobId, 'products');
}

function productRef(jobId, id) {
  return doc(productsCollection(jobId), id);
}

export async function listProducts(jobId) {
  await ensureAuth();
  const snap = await getDocs(productsCollection(jobId));
  return snap.docs.map((d) => d.data());
}

export function subscribeProducts(jobId, callback) {
  let unsubscribe = () => {};
  let cancelled = false;
  ensureAuth().then(() => {
    if (cancelled) return;
    unsubscribe = onSnapshot(productsCollection(jobId), (snap) => {
      callback(snap.docs.map((d) => d.data()));
    });
  });
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function addProduct({ jobId, shelfId, name, upc }) {
  await ensureAuth();
  const ref = doc(productsCollection(jobId));
  const product = { id: ref.id, jobId, shelfId, name: name.trim(), upc: normalizeUpc(upc), createdAt: Date.now() };
  await setDoc(ref, product);
  return product;
}

export async function updateProduct(jobId, id, changes) {
  await ensureAuth();
  const ref = productRef(jobId, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const product = snap.data();
  const updated = {
    ...product,
    ...changes,
    name: changes.name !== undefined ? changes.name.trim() : product.name,
    upc: changes.upc !== undefined ? normalizeUpc(changes.upc) : product.upc,
  };
  await setDoc(ref, updated);
  return updated;
}

export async function deleteProduct(jobId, id) {
  await ensureAuth();
  await deleteDoc(productRef(jobId, id));
}

// Bulk version for large pasted/OCR imports: writes in chunked batches
// instead of one sequential round trip per row, so a 1000+ row job doesn't
// take minutes to save over the network.
export async function addProductsBulk(jobId, items) {
  await ensureAuth();
  const entries = items.map((item) => {
    const ref = doc(productsCollection(jobId));
    return {
      ref,
      product: {
        id: ref.id,
        jobId,
        shelfId: item.shelfId,
        name: item.name.trim(),
        upc: normalizeUpc(item.upc),
        createdAt: Date.now(),
      },
    };
  });

  for (let i = 0; i < entries.length; i += 450) {
    const batch = writeBatch(db);
    for (const { ref, product } of entries.slice(i, i + 450)) batch.set(ref, product);
    await batch.commit();
  }

  return entries.map((e) => e.product);
}

// Tries an exact match first, then falls back to UPC-A/EAN-13 leading-zero
// variants so a scan still resolves even if the printed sheet used the other
// numbering convention. Uses a targeted `in` query instead of fetching the
// whole products collection, since a job can hold 1000+ products and every
// scan would otherwise burn through Firestore's free-tier read quota.
export async function findByUpc(jobId, rawUpc) {
  const variants = upcVariants(rawUpc);
  if (!variants[0]) return null;
  await ensureAuth();
  const snap = await getDocs(query(productsCollection(jobId), where('upc', 'in', variants)));
  if (snap.empty) return null;
  const byUpc = new Map(snap.docs.map((d) => [d.data().upc, d.data()]));
  for (const variant of variants) {
    if (byUpc.has(variant)) return byUpc.get(variant);
  }
  return null;
}
