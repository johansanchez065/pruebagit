import { useLanguage } from '../context/LanguageContext';

export function ReviewTable({ rows, onChangeRow, onDeleteRow, onAddRow, shelfNames }) {
  const { t } = useLanguage();
  return (
    <div className="shelf-group">
      <datalist id="review-shelf-options">
        {shelfNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {rows.map((row) => (
        <div className="review-row" key={row.rowId}>
          <div className="review-row-grid">
            <input
              list="review-shelf-options"
              placeholder={t('review.shelfPlaceholder')}
              value={row.shelf}
              onChange={(e) => onChangeRow(row.rowId, { shelf: e.target.value })}
            />
            <input
              inputMode="numeric"
              placeholder={t('review.upcPlaceholder')}
              value={row.upc}
              onChange={(e) => onChangeRow(row.rowId, { upc: e.target.value })}
            />
          </div>
          <input
            placeholder={t('review.namePlaceholder')}
            value={row.name}
            onChange={(e) => onChangeRow(row.rowId, { name: e.target.value })}
          />
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
      ))}

      <button type="button" className="big-btn big-btn--secondary" onClick={onAddRow}>
        {t('review.addRow')}
      </button>
    </div>
  );
}
