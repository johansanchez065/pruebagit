// Natural sort so "Shelf 10" lands after "Shelf 2" instead of before it.
export function compareShelfNames(a, b) {
  const numA = a.match(/\d+/);
  const numB = b.match(/\d+/);
  if (numA && numB) {
    const diff = Number(numA[0]) - Number(numB[0]);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

export function sortShelves(shelves) {
  return [...shelves].sort((a, b) => compareShelfNames(a.name, b.name));
}

// Numeric positions sort numerically; non-numeric ones (or missing) sink to
// the bottom instead of breaking the sort.
export function compareProductPositions(a, b) {
  const posA = parseInt(a.position, 10);
  const posB = parseInt(b.position, 10);
  const validA = !Number.isNaN(posA);
  const validB = !Number.isNaN(posB);
  if (validA && validB) return posA - posB;
  if (validA) return -1;
  if (validB) return 1;
  return 0;
}

export function sortProductsByPosition(products) {
  return [...products].sort((a, b) => compareProductPositions(a, b));
}
