import { describe, it, expect } from 'vitest';
import { matchesUpcQuery } from './upc';

describe('matchesUpcQuery — partial UPC search (last N digits)', () => {
  it('finds a UPC by its last 6 digits', () => {
    expect(matchesUpcQuery('7265522011', '522011')).toBe(true);
  });

  it('finds a UPC by its last 4 digits', () => {
    expect(matchesUpcQuery('7265522011', '2011')).toBe(true);
  });

  it('finds a UPC by its last 3 digits', () => {
    expect(matchesUpcQuery('7265522011', '011')).toBe(true);
  });

  it('finds a longer UPC by a 5-digit tail', () => {
    expect(matchesUpcQuery('84017920597', '20597')).toBe(true);
  });

  it('finds a longer UPC by a 4-digit tail with a leading zero', () => {
    expect(matchesUpcQuery('84017920597', '0597')).toBe(true);
  });

  it('finds a longer UPC by its last 3 digits', () => {
    expect(matchesUpcQuery('84017920597', '597')).toBe(true);
  });

  it('matches the full UPC', () => {
    expect(matchesUpcQuery('84017920597', '84017920597')).toBe(true);
  });

  it('matches a substring in the middle, not just a suffix', () => {
    expect(matchesUpcQuery('84017920597', '01792')).toBe(true);
  });

  it('does not match digits that are not present', () => {
    expect(matchesUpcQuery('84017920597', '99999')).toBe(false);
  });

  it('does not match an empty query', () => {
    expect(matchesUpcQuery('84017920597', '')).toBe(false);
  });

  it('treats a missing UPC as an empty string instead of throwing', () => {
    expect(matchesUpcQuery(undefined, '597')).toBe(false);
  });
});
