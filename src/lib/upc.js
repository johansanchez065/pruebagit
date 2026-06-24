// Keep only digits, since OCR/typed input often carries stray spaces or dashes
// (e.g. "0383-4747" or a trailing OCR artifact like "O").
export function normalizeUpc(raw) {
  return (raw || '').replace(/\D/g, '');
}

// UPC-A (12 digits) and EAN-13 (13 digits) often encode the same product with
// a leading zero added/removed. A barcode scanner or a price sheet printed in
// one system may not match a sheet printed in the other, so we search across
// both forms instead of forcing the user to know which one was used.
export function upcVariants(raw) {
  const digits = normalizeUpc(raw);
  const variants = new Set([digits]);
  if (digits.length === 12) variants.add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith('0')) variants.add(digits.slice(1));
  return [...variants];
}

// Aisle search rarely has the full code in view — a torn label or a shelf
// tag usually only shows the last few digits. Matching anywhere in the UPC
// (not just a prefix) covers "last 3/4/5/6 digits" and any other partial
// substring the merchandiser can read off the shelf.
export function matchesUpcQuery(productUpc, queryDigits) {
  if (!queryDigits) return false;
  const upcStr = String(productUpc || '');
  return upcStr.includes(queryDigits) || upcStr.endsWith(queryDigits);
}
