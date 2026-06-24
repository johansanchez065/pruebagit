import { describe, it, expect } from 'vitest';
import { filterProducts } from './productSearch';

function product(overrides) {
  return { id: '', description: '', upc: '', position: '', shelfId: '', ...overrides };
}

describe('filterProducts — search across every shelf in the job', () => {
  const shelfById = new Map([
    ['shelf-1', { id: 'shelf-1', name: 'Shelf 1' }],
    ['shelf-2', { id: 'shelf-2', name: 'Shelf 2' }],
    ['shelf-3', { id: 'shelf-3', name: 'Shelf 3' }],
  ]);

  const products = [
    product({ id: 'p1', description: 'CORE KITCHEN CUTTING MATS', upc: '84017920597', position: '1', shelfId: 'shelf-1' }),
    product({ id: 'p2', description: "RAO'S MARINARA SAUCE", upc: '7265522011', position: '1', shelfId: 'shelf-2' }),
    product({ id: 'p3', description: 'YELLOWSTONE BEEF JERKY', upc: '19655723674', position: '3', shelfId: 'shelf-3' }),
  ];

  it('returns null for an empty query (caller falls back to the grouped shelf view)', () => {
    expect(filterProducts(products, '', shelfById)).toBeNull();
    expect(filterProducts(products, '   ', shelfById)).toBeNull();
  });

  it('finds a product on a shelf other than the first one by a UPC suffix', () => {
    const result = filterProducts(products, '522011', shelfById);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p2');
  });

  it('finds a product on the last shelf without narrowing to that shelf first', () => {
    const result = filterProducts(products, '23674', shelfById);
    expect(result.map((p) => p.id)).toEqual(['p3']);
  });

  it('matches across shelves by description text regardless of shelf', () => {
    const result = filterProducts(products, 'sauce', shelfById);
    expect(result.map((p) => p.id)).toEqual(['p2']);
  });

  it('matches by shelf name, surfacing every product on that shelf', () => {
    const result = filterProducts(products, 'shelf 3', shelfById);
    expect(result.map((p) => p.id)).toEqual(['p3']);
  });

  it('matches by position on more than one shelf in the same search', () => {
    const result = filterProducts(products, '1', shelfById);
    const shelfIds = new Set(result.map((p) => p.shelfId));
    // p1 (shelf-1, position "1") and p2 (shelf-2, position "1") both match,
    // proving the search isn't scoped to whichever shelf is "current".
    expect(shelfIds.has('shelf-1')).toBe(true);
    expect(shelfIds.has('shelf-2')).toBe(true);
  });
});
