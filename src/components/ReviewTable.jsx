import { useLanguage } from '../context/LanguageContext';
import { getRowAlerts } from '../lib/reviewAlerts';

export function ReviewTable({ rows, onChangeRow, onDeleteRow, onAddRow, shelfNames }) {
  const { t } = useLanguage();
  const alertsByRow = getRowAlerts(rows);

  return (
    <div className="shelf-group">
      <datalist id="review-shelf-options">
        {shelfNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {rows.map((row) => {
        const alerts = alertsByRow.get(row.rowId) || [];
        return (
          <div className="review-row" key={row.rowId}>
            <div className="review-row-grid">
              <input
                list="review-shelf-options"
                placeholder={t('review.shelfPlaceholder')}
                value={row.shelf}
                onChange={(e) => onChangeRow(row.rowId, { shelf: e.target.value })}
              />
              <input
                placeholder={t('review.positionPlaceholder')}
                value={row.position}
                onChange={(e) => onChangeRow(row.rowId, { position: e.target.value })}
              />
            </div>

            <input
              placeholder={t('review.descriptionPlaceholder')}
              value={row.description}
              onChange={(e) => onChangeRow(row.rowId, { description: e.target.value })}
            />

            <div className="review-row-grid">
              <input
                inputMode="numeric"
                placeholder={t('review.upcPlaceholder')}
                value={row.upc}
                onChange={(e) => onChangeRow(row.rowId, { upc: e.target.value })}
              />
              <input
                placeholder={t('review.stockcodePlaceholder')}
                value={row.stockcode}
                onChange={(e) => onChangeRow(row.rowId, { stockcode: e.target.value })}
              />
            </div>

            <div className="review-row-3col">
              <input
                placeholder={t('review.sizePlaceholder')}
                value={row.size}
                onChange={(e) => onChangeRow(row.rowId, { size: e.target.value })}
              />
              <input
                placeholder={t('review.uomPlaceholder')}
                value={row.uom}
                onChange={(e) => onChangeRow(row.rowId, { uom: e.target.value })}
              />
              <input
                inputMode="numeric"
                placeholder={t('review.facingsPlaceholder')}
                value={row.facings}
                onChange={(e) => onChangeRow(row.rowId, { facings: e.target.value })}
              />
            </div>

            {alerts.length > 0 && (
              <div className="review-row-alerts">
                {alerts.map((alert) => (
                  <span key={alert.key} className={`chip ${alert.severity === 'critical' ? 'chip--red' : 'chip--amber'}`}>
                    {t(alert.key)}
                  </span>
                ))}
              </div>
            )}

            <div className="review-row-actions">
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                aria-label={t('review.deleteRowLabel')}
                onClick={() => onDeleteRow(row.rowId)}
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}

      <button type="button" className="big-btn big-btn--secondary" onClick={onAddRow}>
        {t('review.addRow')}
      </button>
    </div>
  );
}
