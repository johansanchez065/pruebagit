import { useLanguage } from '../context/LanguageContext';

// Shown instead of a generic list row when a search narrows to exactly one
// product — in the aisle, that single confident match deserves a big,
// glanceable card (shelf + position front and center) instead of a tap.
export function ProductMatchCard({ product, shelfName, onClick, onSetStatus }) {
  const { t } = useLanguage();
  const isFound = product.status === 'found';
  const isMissing = product.status === 'not_found';
  const statusLabel = isFound
    ? t('productMatch.statusFound')
    : isMissing
      ? t('productMatch.statusNotFound')
      : t('productMatch.statusPending');

  return (
    <div className="card product-match" onClick={onClick} role="button" tabIndex={0}>
      <div className="product-match-description">{product.description}</div>
      <div className="product-match-upc">UPC: {product.upc || t('productRow.noUpc')}</div>
      {shelfName && <div className="product-match-shelf">{shelfName}</div>}
      <div className="product-match-meta">
        {product.position && (
          <span className="chip chip--green">{t('productMatch.position', { position: product.position })}</span>
        )}
        {product.size && <span className="chip chip--amber">{[product.size, product.uom].filter(Boolean).join(' ')}</span>}
        {product.facings && <span className="chip chip--amber">{t('productMatch.facings', { facings: product.facings })}</span>}
        <span className={`chip ${isFound ? 'chip--green' : isMissing ? 'chip--red' : 'chip--amber'}`}>{statusLabel}</span>
      </div>
      {onSetStatus && (
        <div className="status-toggle product-match-toggle" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`status-btn status-btn--found ${isFound ? 'is-active' : ''}`}
            aria-label={t('productRow.markFound')}
            onClick={() => onSetStatus(product, isFound ? null : 'found')}
          >
            ✅
          </button>
          <button
            type="button"
            className={`status-btn status-btn--missing ${isMissing ? 'is-active' : ''}`}
            aria-label={t('productRow.markNotFound')}
            onClick={() => onSetStatus(product, isMissing ? null : 'not_found')}
          >
            ❌
          </button>
        </div>
      )}
    </div>
  );
}
