// Real planogram reports (e.g. "Shelf: 12, Length: 22' 6.00", Height: 0'
// 8.00", Depth: 1' 7.00", Product: 22' 5.81"") put extra dimension text
// after the shelf number — only the leading number/name matters here, so
// the match isn't anchored to the end of the line anymore.
const SHELF_HEADER_RE = /^shelf\s*#?\s*:?\s*([\w.-]+)\b/i;

// Printed planogram rows look like "9  7265522011  HEALTHY CHOICE CAFE
// STEAMERS MEX  033104  9.25  OZ  1  9  6  5.98  10.54": an optional
// position number, then the UPC, then the product name, then a stockcode
// and a bunch of columns (size/UOM/facings/pack out/case pack/mvt/DOS) this
// app has no use for. Matching stops at the stockcode; everything after it
// is simply ignored.
const REPORT_ROW_RE = /^(?:\d{1,3}\s+)?(\d{6,14})\s+(.+?)\s+\d{4,8}\b/;

// Simpler hand-typed/pasted lines: "<name> <run of 6-14 digits>" with the
// UPC trailing instead of leading. 6 is a deliberately loose floor so short
// codes still get picked up for the reviewer to fix.
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

    const reportMatch = line.match(REPORT_ROW_RE);
    if (reportMatch) {
      rows.push({
        rowId: `row-${rows.length}-${Date.now()}-${unassignedCounter++}`,
        shelf: currentShelf,
        name: reportMatch[2].trim(),
        upc: reportMatch[1],
      });
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
