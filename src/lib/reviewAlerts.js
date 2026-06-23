const MIN_UPC_LENGTH = 6;

const ALERTS = {
  upcEmpty: { key: 'review.alert.upcEmpty', severity: 'critical' },
  upcLetters: { key: 'review.alert.upcLetters', severity: 'critical' },
  upcTooShort: { key: 'review.alert.upcTooShort', severity: 'warning' },
  upcDuplicate: { key: 'review.alert.upcDuplicate', severity: 'warning' },
  shelfMissing: { key: 'review.alert.shelfMissing', severity: 'critical' },
  positionMissing: { key: 'review.alert.positionMissing', severity: 'warning' },
  positionDuplicate: { key: 'review.alert.positionDuplicate', severity: 'warning' },
  descriptionEmpty: { key: 'review.alert.descriptionEmpty', severity: 'critical' },
};

// Alerts are informational chips, never save-blockers — looks at every row
// together (not one in isolation) since duplicate UPC/position detection
// needs the full set of rows being reviewed.
export function getRowAlerts(rows) {
  const upcCounts = new Map();
  const positionCounts = new Map();

  for (const row of rows) {
    const upc = (row.upc || '').trim();
    if (upc) upcCounts.set(upc, (upcCounts.get(upc) || 0) + 1);

    const position = (row.position || '').trim();
    if (position) {
      const key = `${(row.shelf || '').trim().toLowerCase()}::${position}`;
      positionCounts.set(key, (positionCounts.get(key) || 0) + 1);
    }
  }

  const result = new Map();
  for (const row of rows) {
    const alerts = [];
    const upc = (row.upc || '').trim();
    const position = (row.position || '').trim();
    const positionKey = `${(row.shelf || '').trim().toLowerCase()}::${position}`;

    if (!upc) alerts.push(ALERTS.upcEmpty);
    else if (/[A-Za-z]/.test(upc)) alerts.push(ALERTS.upcLetters);
    else if (upc.length < MIN_UPC_LENGTH) alerts.push(ALERTS.upcTooShort);
    if (upc && upcCounts.get(upc) > 1) alerts.push(ALERTS.upcDuplicate);

    if (!row.shelf || !row.shelf.trim()) alerts.push(ALERTS.shelfMissing);

    if (!position) alerts.push(ALERTS.positionMissing);
    else if (positionCounts.get(positionKey) > 1) alerts.push(ALERTS.positionDuplicate);

    if (!row.description || !row.description.trim()) alerts.push(ALERTS.descriptionEmpty);

    result.set(row.rowId, alerts);
  }
  return result;
}
