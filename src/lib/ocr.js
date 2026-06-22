import { createWorker } from 'tesseract.js';

// One photo is processed at a time (never a rapid sequence), so spinning up
// and tearing down a worker per call keeps lifecycle management simple at a
// negligible cost compared to a long-lived shared worker.
export async function recognizeSheetText(imageSource, { onProgress } = {}) {
  const worker = await createWorker('spa', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(imageSource);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
