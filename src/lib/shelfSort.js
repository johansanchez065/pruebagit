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
