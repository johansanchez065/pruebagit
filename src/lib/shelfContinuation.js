// Pulled out of ReviewPage so the continuation-page backfill (bulk-assigning
// a shelf to rows that arrived with none) is unit-testable without
// rendering React. Rows that already have a shelf — e.g. because a "Shelf:"
// header was detected partway through the import — are left untouched.

export function countMissingShelf(rows) {
  return rows.filter((row) => !row.shelf.trim()).length;
}

export function applyShelfToMissingRows(rows, shelfName) {
  return rows.map((row) => (row.shelf.trim() ? row : { ...row, shelf: shelfName }));
}
