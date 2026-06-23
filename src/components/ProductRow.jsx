import { useLanguage } from '../context/LanguageContext';

export function ProductRow({ product, shelfName, onClick, onSetStatus }) {
  const { t } = useLanguage();
  const isFound = product.status === 'found';
  const isMissing = product.status === 'not_found';

  return (
    <div className="product-row" onClick={onClick} role="button" tabIndex={0}>
      <div className="product-row-main">
        <div className="product-row-name">{product.name}</div>
        <div className="product-row-upc">{product.upc || t('productRow.noUpc')}</div>
        {product.status && (
          <div className={`product-row-status product-row-status--${isFound ? 'found' : 'missing'}`}>
            {t(isFound ? 'productRow.foundBy' : 'productRow.notFoundBy', { name: product.statusBy })}
          </div>
        )}
      </div>
      {onSetStatus && (
        <div className="status-toggle" onClick={(e) => e.stopPropagation()}>
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
      {shelfName ? <span className="chip chip--green">{shelfName}</span> : <span aria-hidden>›</span>}
    </div>
  );
}
