import { getDb, newId } from './db';

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function compressImage(file) {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(img.src);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
}

export async function listPhotos(jobId) {
  const db = await getDb();
  const photos = await db.getAllFromIndex('photos', 'jobId', jobId);
  return photos.sort((a, b) => b.createdAt - a.createdAt);
}

// Reference photos are visual-only (planogram/shelf shots), not OCR input —
// compressing before storing keeps a full job's worth of photos from blowing
// past IndexedDB's practical quota on a phone.
export async function addPhoto(jobId, file) {
  const db = await getDb();
  const blob = await compressImage(file);
  const photo = { id: newId(), jobId, blob, createdAt: Date.now() };
  await db.add('photos', photo);
  return photo;
}

export async function deletePhoto(id) {
  const db = await getDb();
  await db.delete('photos', id);
}
