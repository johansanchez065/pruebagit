import { ProductRow } from './ProductRow';
import { sortProductsByPosition } from '../lib/shelfSort';
import { useLanguage } from '../context/LanguageContext';

export function ShelfGroup({ shelf, products, onProductClick, onSetStatus }) {
  const { t } = useLanguage();
  const sorted = sortProductsByPosition(products);
  const found = products.filter((p) => p.status === 'found').length;

  return (
    <div className="shelf-group">
      <div className="shelf-group-title">
        <span>{shelf.name}</span>
        <span className="shelf-group-progress">{t('shelfGroup.progress', { found, total: products.length })}</span>
      </div>
      {sorted.map((product) => (
        <ProductRow
          key={product.id}
          product={product}
          onClick={() => onProductClick(product)}
          onSetStatus={onSetStatus}
        />
      ))}
    </div>
  );
}
