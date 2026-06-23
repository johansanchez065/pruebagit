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
    const { data } = await worker.recognize(imageSource, {}, { blocks: true });
    return reconstructRows(data) ?? data.text;
  } finally {
    await worker.terminate();
  }
}

// Printed planogram reports have hard vertical gridlines between columns
// (Position | UPC | Long Description | Stockcode | ...). Tesseract's own
// line/paragraph segmentation routinely gets that wrong for gridded tables —
// it can merge two table rows into one "line" or split one row's columns
// into separate lines, which scrambles which UPC belongs to which
// description. Rebuilding rows directly from each word's bounding box
// (cluster by vertical overlap, then sort left-to-right within a cluster)
// follows the actual printed layout instead of Tesseract's guess, so it
// reconstructs "<position> <upc> <description> <stockcode> ..." as one line
// far more reliably. Returns null (falls back to `data.text`) if this photo
// has no word-level geometry at all.
function reconstructRows(page) {
  const words = [];
  for (const block of page.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) {
          if (word.text.trim()) words.push(word);
        }
      }
    }
  }
  if (words.length === 0) return null;

  words.sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const rows = [];
  for (const word of words) {
    const { y0, y1 } = word.bbox;
    let row = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      const candidate = rows[i];
      const overlap = Math.min(candidate.y1, y1) - Math.max(candidate.y0, y0);
      const minHeight = Math.min(candidate.y1 - candidate.y0, y1 - y0);
      if (overlap > minHeight * 0.5) {
        row = candidate;
        break;
      }
    }
    if (row) {
      row.words.push(word);
      row.y0 = Math.min(row.y0, y0);
      row.y1 = Math.max(row.y1, y1);
    } else {
      rows.push({ y0, y1, words: [word] });
    }
  }

  rows.sort((a, b) => a.y0 - b.y0);
  return rows
    .map((row) =>
      row.words
        .sort((a, b) => a.bbox.x0 - b.bbox.x0)
        .map((w) => w.text)
        .join(' '),
    )
    .join('\n');
}
