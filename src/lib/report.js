import { formatDateTime } from './time';
import { sortShelves } from './shelfSort';

export function buildShelfBreakdown(shelves, products) {
  const byShelf = new Map();
  for (const product of products) {
    const list = byShelf.get(product.shelfId) || [];
    list.push(product);
    byShelf.set(product.shelfId, list);
  }
  return sortShelves(shelves).map((shelf) => {
    const shelfProducts = byShelf.get(shelf.id) || [];
    const found = shelfProducts.filter((p) => p.status === 'found').length;
    return { shelf, found, total: shelfProducts.length };
  });
}

// Plain text only (no markdown/HTML) so it pastes cleanly into a text
// message or email to a supervisor — that's the entire delivery mechanism.
export function buildReportText({ job, products, shelves, displayName, lang, t }) {
  const total = products.length;
  const found = products.filter((p) => p.status === 'found').length;
  const notFoundList = products.filter((p) => p.status === 'not_found');
  const pending = total - found - notFoundList.length;
  const shelfById = new Map(shelves.map((s) => [s.id, s]));
  const breakdown = buildShelfBreakdown(shelves, products);

  const lines = [
    t('report.lineJob', { name: job.name }),
    t('report.lineUser', { name: displayName }),
    t('report.lineDate', { date: formatDateTime(Date.now(), lang) }),
    '',
    t('report.lineTotal', { total }),
    t('report.lineFound', { found }),
    t('report.linePending', { pending }),
    t('report.lineNotFound', { count: notFoundList.length }),
    '',
    t('report.breakdownTitle'),
  ];

  for (const row of breakdown) {
    lines.push(`${row.shelf.name}: ${row.found}/${row.total} ${t('report.foundSuffix')}`);
  }

  if (notFoundList.length > 0) {
    lines.push('');
    lines.push(t('report.notFoundTitle'));
    for (const p of notFoundList) {
      const shelfName = shelfById.get(p.shelfId)?.name || '';
      lines.push(`${p.upc || '—'} - ${p.description} - ${shelfName} - ${p.position || '—'}`);
    }
  }

  return lines.join('\n');
}
