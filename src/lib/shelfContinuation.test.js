import { describe, it, expect } from 'vitest';
import { countMissingShelf, applyShelfToMissingRows } from './shelfContinuation';

function row(overrides) {
  return { rowId: '', shelf: '', position: '', description: '', upc: '', ...overrides };
}

describe('countMissingShelf', () => {
  it('counts only rows with a blank or whitespace-only shelf', () => {
    const rows = [row({ shelf: 'Shelf 3' }), row({ shelf: '' }), row({ shelf: '   ' })];
    expect(countMissingShelf(rows)).toBe(2);
  });

  it('returns 0 when every row already has a shelf', () => {
    const rows = [row({ shelf: 'Shelf 1' }), row({ shelf: 'Shelf 2' })];
    expect(countMissingShelf(rows)).toBe(0);
  });
});

describe('applyShelfToMissingRows — continuation-page backfill', () => {
  it('assigns the given shelf only to rows that came in with no shelf', () => {
    const rows = [
      row({ rowId: 'a', position: '22', shelf: '' }),
      row({ rowId: 'b', position: '23', shelf: '' }),
    ];
    const result = applyShelfToMissingRows(rows, 'Shelf 3');
    expect(result.every((r) => r.shelf === 'Shelf 3')).toBe(true);
  });

  it('leaves a row alone if a Shelf header was detected partway through the import', () => {
    const rows = [
      row({ rowId: 'a', position: '22', shelf: '' }),
      row({ rowId: 'b', position: '1', shelf: 'Shelf 4' }), // new header mid-import
    ];
    const result = applyShelfToMissingRows(rows, 'Shelf 3');
    expect(result.find((r) => r.rowId === 'a').shelf).toBe('Shelf 3');
    expect(result.find((r) => r.rowId === 'b').shelf).toBe('Shelf 4');
  });

  it('does not mutate the original rows array', () => {
    const rows = [row({ rowId: 'a', shelf: '' })];
    applyShelfToMissingRows(rows, 'Shelf 3');
    expect(rows[0].shelf).toBe('');
  });
});
