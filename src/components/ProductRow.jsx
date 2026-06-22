import { useLanguage } from '../context/LanguageContext';

export function ProductRow({ product, shelfName, onClick }) {
  const { t } = useLanguage();
  return (
    <div className="product-row" onClick={onClick} role="button" tabIndex={0}>
      <div className="product-row-main">
        <div className="product-row-name">{product.name}</div>
        <div className="product-row-upc">{product.upc || t('productRow.noUpc')}</div>
      </div>
      {shelfName ? <span className="chip chip--green">{shelfName}</span> : <span aria-hidden>›</span>}
    </div>
  );
}
