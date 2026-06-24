import { normalizeUpc, matchesUpcQuery } from './upc';

// The merchandiser searches once per job, never per shelf — a product could
// be on any shelf, and re-selecting a shelf first would be the exact extra
// "process" step this app is meant to remove. So this always scans every
// product in the job, regardless of which shelf it's on.
//
// Matches full UPC, any UPC substring (which covers "last 4/5/6 digits"
// since that's just a suffix substring), description, position, or shelf
// name — whichever the merchandiser happened to type.
export function filterProducts(products, query, shelfById) {
  const trimmed = (query || '').trim().toLowerCase();
  if (!trimmed) return null;
  const queryDigits = normalizeUpc(trimmed);
  return products.filter((p) => {
    const descMatch = p.description.toLowerCase().includes(trimmed);
    const upcMatch = matchesUpcQuery(p.upc, queryDigits);
    const positionMatch = p.position && p.position.toLowerCase().includes(trimmed);
    const shelfName = shelfById.get(p.shelfId)?.name || '';
    const shelfMatch = shelfName.toLowerCase().includes(trimmed);
    return descMatch || upcMatch || positionMatch || shelfMatch;
  });
}
