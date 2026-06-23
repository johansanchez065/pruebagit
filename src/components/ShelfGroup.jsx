import { ProductRow } from './ProductRow';

export function ShelfGroup({ shelf, products, onProductClick, onSetStatus }) {
  return (
    <div className="shelf-group">
      <div className="shelf-group-title">
        {shelf.name} · {products.length}
      </div>
      {products.map((product) => (
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
