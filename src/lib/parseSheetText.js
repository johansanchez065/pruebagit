// Real planogram reports (e.g. "Shelf: 12, Length: 22' 6.00", Height: 0'
// 8.00", Depth: 1' 7.00", Product: 22' 5.81"") put extra dimension text
// after the shelf number — only the leading number/name matters here, so
// the match isn't anchored to the end of the line anymore.
const SHELF_HEADER_RE = /^shelf\s*#?\s*:?\s*([\w.-]+)\b/i;

// Printed planogram rows look like "28  73891202239  BOSTON MARKET SWEET &
// SOUR CHIC  037739  14.00  OZ  1": an optional position number, the UPC,
// the long description, a stockcode, then optionally "<size> <uom>" and a
// facings count. Everything after that (Status/Pack Out/Case pack/Mvt/DOS)
// this app has no use for, so matching simply stops once it has facings.
const REPORT_ROW_RE =
  /^(?:(\d{1,3})\s+)?(\d{6,14})\s+(.+?)\s+(\d{4,8})\b(?:\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{1,4})\b)?(?:\s+(\d{1,2})\b)?/;

// Simpler hand-typed/pasted lines: "<name> <run of 6-14 digits>" with the
// UPC trailing instead of leading. 6 is a deliberately loose floor so short
// codes still get picked up for the reviewer to fix.
const PRODUCT_LINE_RE = /^(.*\S)\s+(\d{6,14})\s*$/;

// The printed column-header row ("Position UPC Long Description Stockcode
// Size UOM Facings Status Pack Out Case pack Mvt DOS") matches none of the
// row patterns above, so without this it falls into the catch-all and gets
// saved as a fake product. Headers never contain digits and repeat several
// of these column names, which real descriptions essentially never do
// together — that combination is what tells the two apart.
const HEADER_KEYWORDS = [
  'position', 'upc', 'description', 'stockcode', 'size', 'uom', 'facings', 'status', 'pack', 'case', 'mvt', 'dos',
];

function isHeaderLine(line) {
  if (/\d/.test(line)) return false;
  const lower = line.toLowerCase();
  const matches = HEADER_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  return matches >= 2;
}

// The report also prints a "Totals:" footer between shelf sections, with no
// product data on its own line — same kind of noise as the header row.
const NOISE_LINE_RE = /^totals?:?$/i;

let unassignedCounter = 0;

function blankRow(shelf) {
  return {
    rowId: '',
    shelf,
    position: '',
    description: '',
    upc: '',
    stockcode: '',
    size: '',
    uom: '',
    facings: '',
  };
}

function nextRowId() {
  return `row-${Date.now()}-${unassignedCounter++}`;
}

// Parses the plain text extracted from a planogram sheet (either via OCR or
// pasted by hand) into draft rows for the review screen. Nothing here is
// persisted — every row, including unparsed/noisy lines, is surfaced so the
// user can fix or discard it before it touches the database.
//
// `defaultShelf` is the shelf the user is currently photographing/pasting —
// most imports are one shelf at a time, so every row defaults to it unless a
// `Shelf:` header line inside the text itself overrides it for the rows that
// follow.
export function parseSheetText(text, { defaultShelf = '' } = {}) {
  const rows = [];
  let currentShelf = defaultShelf;

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

    if (isHeaderLine(line) || NOISE_LINE_RE.test(line)) continue;

    const reportMatch = line.match(REPORT_ROW_RE);
    if (reportMatch) {
      rows.push({
        ...blankRow(currentShelf),
        rowId: nextRowId(),
        position: reportMatch[1] || '',
        upc: reportMatch[2],
        description: reportMatch[3].trim(),
        stockcode: reportMatch[4] || '',
        size: reportMatch[5] || '',
        uom: reportMatch[6] || '',
        facings: reportMatch[7] || '',
      });
      continue;
    }

    const productMatch = line.match(PRODUCT_LINE_RE);
    if (productMatch) {
      rows.push({
        ...blankRow(currentShelf),
        rowId: nextRowId(),
        description: productMatch[1].trim(),
        upc: productMatch[2],
      });
      continue;
    }

    // Couldn't confidently split description/UPC (common with OCR noise) —
    // keep the raw line as an editable row instead of silently dropping it.
    rows.push({
      ...blankRow(currentShelf),
      rowId: nextRowId(),
      description: line,
    });
  }

  return rows;
}
