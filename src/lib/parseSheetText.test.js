import { describe, it, expect } from 'vitest';
import { parseSheetText } from './parseSheetText';

describe('parseSheetText — row mode (real printed planogram pages)', () => {
  it('parses a real "Category Schematic" table page with header, two shelves, and a Totals footer', () => {
    const sheet = `
Position UPC Long Description Stockcode Size UOM Status Facings Case pack DOS Pack Out
Shelf: 1, Length: 4' 0.00", Height: 0' 7.00", Depth: 1' 7.00", Product: 4' 0.00"
1 84017920597 CORE KITCHEN CUTTING MATS NONSLIP 4PC DSD-IMP 4.00 EA 137493 1 3 0.00 5
2 81332601475 CORE KITCHEN TULIP CUTTING BOARD LARG DSD-IMP 1.00 EA 316202 1 3 233.33 5
3 19655723674 CORE BAMBOO MAGNETIC CUTTING BOARD & DSD-IMP 2.00 EA N-123941 1 3 0.00 5
4 84017921355 CORE BAMBOO CUTTING BOARD 3PK DSD-IMP 3.00 EA N-123969 1 3 0.00 5
Totals: 4 12 933.33 20
Shelf: 2, Length: 1' 6.00", Height: 0' 6.30", Product: 1' 2.50"
1 84887492916 CORE KITCHEN 10 PC BAG CLIP SET DSD-IMP 10.00 EA 137633 1 3 0.00 5
2 84017920563 CORE KITCHEN FOOTED GRIP CUTTING BOAR DSD-IMP 1.00 EA 137451 1 3 0.00 3
Totals: 2 6 0.00 6
Printed on 5/27/2023 at 12:46:24 PM
Page # 2
`;
    const { rows, warnings } = parseSheetText(sheet, { defaultShelf: '' });

    expect(warnings).toEqual([]);
    expect(rows).toHaveLength(6);

    expect(rows[0]).toMatchObject({
      shelf: 'Shelf 1',
      position: '1',
      upc: '84017920597',
      description: 'CORE KITCHEN CUTTING MATS NONSLIP 4PC',
      stockcode: 'DSD-IMP',
      size: '4.00',
      uom: 'EA',
      facings: '1',
    });
    expect(rows[4]).toMatchObject({
      shelf: 'Shelf 2',
      position: '1',
      upc: '84887492916',
      description: 'CORE KITCHEN 10 PC BAG CLIP SET',
      stockcode: 'DSD-IMP',
      size: '10.00',
      uom: 'EA',
      facings: '1',
    });
    // No row was created from the header row, the Totals footers, or the
    // page/print metadata lines.
    for (const row of rows) {
      expect(row.description.toLowerCase()).not.toContain('total');
      expect(row.description.toLowerCase()).not.toContain('printed on');
    }
  });

  it('does not let a stray whole number in the description end the row early', () => {
    // "10 PC" inside the description could be mistaken for a bare
    // "<size> <uom>" pair if size didn't require a decimal point.
    const { rows } = parseSheetText(
      '1 84887492916 CORE KITCHEN 10 PC BAG CLIP SET DSD-IMP 10.00 EA 137633 1 3 0.00 5',
      { defaultShelf: 'Shelf 2' },
    );
    expect(rows[0].description).toBe('CORE KITCHEN 10 PC BAG CLIP SET');
    expect(rows[0].stockcode).toBe('DSD-IMP');
    expect(rows[0].size).toBe('10.00');
    expect(rows[0].uom).toBe('EA');
  });

  it('handles hyphens and slashes inside descriptions without breaking the column split', () => {
    const { rows } = parseSheetText(
      '6 84897492421 CORE KITCHEN IN-SINK STRAINER - SLATE DSD-IMP 1.00 EA 347280 1 3 87.50 3',
      { defaultShelf: 'Shelf 3' },
    );
    expect(rows[0]).toMatchObject({
      position: '6',
      upc: '84897492421',
      description: 'CORE KITCHEN IN-SINK STRAINER - SLATE',
      stockcode: 'DSD-IMP',
      size: '1.00',
      uom: 'EA',
      facings: '1',
    });
  });

  it('still parses the older numeric-stockcode report format', () => {
    const { rows } = parseSheetText("28  73891202239  BOSTON MARKET SWEET & SOUR CHIC  037739  14.00  OZ  1", {
      defaultShelf: 'Shelf 1',
    });
    expect(rows[0]).toMatchObject({
      position: '28',
      upc: '73891202239',
      description: 'BOSTON MARKET SWEET & SOUR CHIC',
      stockcode: '037739',
      size: '14.00',
      uom: 'OZ',
      facings: '1',
    });
  });

  it('filters header/footer/metadata noise without dropping real rows', () => {
    const sheet = `
Position UPC Long Description Stockcode Size UOM Status Facings Case pack DOS Pack Out
Totals: 4 12 933.33 20
Grand Tot 46 138 1.85 141
Printed on 5/27/2023 at 12:46:24 PM
Page #3
Length: 3' 10.00"
Height: 0' 7.00"
Depth: 1' 7.00"
Product: 0' 0.00"
1 84017920633 CORE MINI TONGS 2PK BLUE/MOONS DSD-IMP 2.00 EA 137528 1 3 0.00 3
`;
    const { rows } = parseSheetText(sheet, { defaultShelf: 'Shelf 3' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ upc: '84017920633', description: 'CORE MINI TONGS 2PK BLUE/MOONS' });
  });
});

describe('parseSheetText — column mode (iPhone column-by-column paste)', () => {
  it('zips Position/UPC/Description/Stockcode column blocks by index', () => {
    const columnPaste = `
Position
UPC
Long Description
Stockcode
1
2
3
4
7265522011
84017920597
19655723674
84897421355
HEALTHY CHOICE FROZEN MEAL
RAO'S MARINARA SAUCE
YELLOWSTONE BEEF JERKY
STOUFFER'S LASAGNA
137493
316202
123941
137542
`;
    const { rows, warnings } = parseSheetText(columnPaste, { defaultShelf: 'Shelf 5' });
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.position)).toEqual(['1', '2', '3', '4']);
    expect(rows.map((r) => r.upc)).toEqual(['7265522011', '84017920597', '19655723674', '84897421355']);
    expect(rows.map((r) => r.description)).toEqual([
      'HEALTHY CHOICE FROZEN MEAL',
      "RAO'S MARINARA SAUCE",
      'YELLOWSTONE BEEF JERKY',
      "STOUFFER'S LASAGNA",
    ]);
    expect(rows.map((r) => r.stockcode)).toEqual(['137493', '316202', '123941', '137542']);
    expect(rows.every((r) => r.shelf === 'Shelf 5')).toBe(true);
    expect(warnings).toEqual([]);
  });

  it('splits a single line of concatenated descriptions on known brand starts', () => {
    const columnPaste = `
1
2
3
4
7265522011
84017920597
19655723674
84897421355
HEALTHY CHOICE FROZEN MEAL RAO'S MARINARA SAUCE YELLOWSTONE BEEF JERKY STOUFFER'S LASAGNA
`;
    const { rows } = parseSheetText(columnPaste, { defaultShelf: 'Shelf 5' });
    expect(rows.map((r) => r.description)).toEqual([
      'HEALTHY CHOICE FROZEN MEAL',
      "RAO'S MARINARA SAUCE",
      'YELLOWSTONE BEEF JERKY',
      "STOUFFER'S LASAGNA",
    ]);
  });

  it('splits brand names using a curly apostrophe the same as a straight one', () => {
    const line = "RAO’S MARINARA SAUCE MARIE CALLENDER’S POT PIE";
    const { rows } = parseSheetText(`1\n2\n7265522011\n84017920597\n${line}`, { defaultShelf: 'Shelf 5' });
    expect(rows.map((r) => r.description)).toEqual(['RAO’S MARINARA SAUCE', 'MARIE CALLENDER’S POT PIE']);
  });

  it('starts a new shelf section on a Shelf header inside column-pasted text', () => {
    const columnPaste = `
Shelf: 1
1
2
7265522011
84017920597
HEALTHY CHOICE FROZEN MEAL
RAO'S MARINARA SAUCE
Shelf: 2
1
19655723674
YELLOWSTONE BEEF JERKY
`;
    const { rows } = parseSheetText(columnPaste, { defaultShelf: '' });
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.shelf === 'Shelf 1')).toHaveLength(2);
    expect(rows.filter((r) => r.shelf === 'Shelf 2')).toHaveLength(1);
    expect(rows.find((r) => r.upc === '19655723674').shelf).toBe('Shelf 2');
  });

  it('warns on a position/UPC/stockcode count mismatch instead of guessing', () => {
    const columnPaste = `
1
2
3
7265522011
84017920597
HEALTHY CHOICE FROZEN MEAL
RAO'S MARINARA SAUCE
137493
`;
    const { warnings } = parseSheetText(columnPaste, { defaultShelf: 'Shelf 5' });
    expect(warnings.some((w) => w.key === 'review.warning.positionUpcMismatch')).toBe(true);
  });
});

describe('parseSheetText — header/footer filtering', () => {
  it('drops the printed column-header row in row mode', () => {
    const { rows } = parseSheetText(
      'Position UPC Long Description Stockcode Size UOM Status Facings Case pack DOS Pack Out\n1 84017920597 SOME PRODUCT DSD-IMP 4.00 EA 137493 1 3 0.00 5',
      { defaultShelf: '' },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].upc).toBe('84017920597');
  });

  it('drops the same header words pasted one-per-line in column mode', () => {
    const columnPaste = 'Position\nUPC\nLong Description\nStockcode\n1\n7265522011\nHEALTHY CHOICE FROZEN MEAL\n137493';
    const { rows } = parseSheetText(columnPaste, { defaultShelf: '' });
    expect(rows).toHaveLength(1);
    expect(rows[0].upc).toBe('7265522011');
  });
});
