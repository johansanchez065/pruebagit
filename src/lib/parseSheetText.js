const SHELF_HEADER_RE = /^shelf\s*#?\s*([\w.-]+)\s*:?\s*$/i;
// A product line is "<name> <run of 6-14 digits>" — UPC/EAN codes in the
// field range from 8 (UPC-E-ish) to 13-14 digits; 6 is a deliberately loose
// floor so short codes still get picked up for the reviewer to fix.
const PRODUCT_LINE_RE = /^(.*\S)\s+(\d{6,14})\s*$/;

let unassignedCounter = 0;

// Parses the plain text extracted from a planogram sheet (either via OCR or
// pasted by hand) into draft rows for the review screen. Nothing here is
// persisted — every row, including unparsed/noisy lines, is surfaced so the
// user can fix or discard it before it touches the database.
export function parseSheetText(text) {
  const rows = [];
  let currentShelf = '';

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const headerMatch = line.match(SHELF_HEADER_RE);
    if (headerMatch) {
      currentShelf = `Shelf ${headerMatch[1]}`;
      continue;
    }

    const productMatch = line.match(PRODUCT_LINE_RE);
    if (productMatch) {
      rows.push({
        rowId: `row-${rows.length}-${Date.now()}-${unassignedCounter++}`,
        shelf: currentShelf,
        name: productMatch[1].trim(),
        upc: productMatch[2],
      });
      continue;
    }

    // Couldn't confidently split name/UPC (common with OCR noise) — keep the
    // raw line as an editable row instead of silently dropping it.
    rows.push({
      rowId: `row-${rows.length}-${Date.now()}-${unassignedCounter++}`,
      shelf: currentShelf,
      name: line,
      upc: '',
    });
  }

  return rows;
}
