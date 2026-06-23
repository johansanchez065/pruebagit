import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, ensureAuth, subscribeWithAuth } from '../firebase/config';
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
  return subscribeWithAuth(() =>
    onSnapshot(productsCollection(jobId), (snap) => {
      callback(snap.docs.map((d) => d.data()));
    }),
  );
}

export async function addProduct({ jobId, shelfId, name, upc }) {
  await ensureAuth();
  const ref = doc(productsCollection(jobId));
  const product = { id: ref.id, jobId, shelfId, name: name.trim(), upc: normalizeUpc(upc), createdAt: Date.now() };
  await setDoc(ref, product);
  return product;
}

// Partial update (not read+overwrite): a concurrent status tap from a
// teammate while this edit is in flight must not get clobbered.
export async function updateProduct(jobId, id, changes) {
  await ensureAuth();
  const patch = { ...changes };
  if (patch.name !== undefined) patch.name = patch.name.trim();
  if (patch.upc !== undefined) patch.upc = normalizeUpc(patch.upc);
  await updateDoc(productRef(jobId, id), patch);
}

// 1-tap collaboration: marks a product found/not-found with who and when,
// without touching name/UPC/shelf. `status: null` clears it back to pending.
export async function setProductStatus(jobId, id, status, by) {
  await ensureAuth();
  const ref = productRef(jobId, id);
  if (status === null) {
    await updateDoc(ref, { status: deleteField(), statusBy: deleteField(), statusAt: deleteField() });
  } else {
    await updateDoc(ref, { status, statusBy: by, statusAt: Date.now() });
  }
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
