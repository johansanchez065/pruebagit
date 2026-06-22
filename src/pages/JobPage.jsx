import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getJob } from '../db/jobsRepo';
import { listShelves, findOrCreateShelf } from '../db/shelvesRepo';
import { listProducts, updateProduct, deleteProduct } from '../db/productsRepo';
import { normalizeUpc } from '../lib/upc';
import { sortShelves } from '../lib/shelfSort';
import { BigButton } from '../components/BigButton';
import { CountdownChip } from '../components/CountdownChip';
import { SearchBar } from '../components/SearchBar';
import { ShelfGroup } from '../components/ShelfGroup';
import { ProductRow } from '../components/ProductRow';
import { ProductEditModal } from '../components/ProductEditModal';
import { AddOptionsSheet } from '../components/AddOptionsSheet';
import { EmptyState } from '../components/EmptyState';
import { useCountdown } from '../hooks/useCountdown';
import { useToast } from '../context/ToastContext';

export function JobPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [job, setJob] = useState(undefined);
  const [shelves, setShelves] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const remaining = useCountdown(job || null);

  const refresh = useCallback(async () => {
    const [j, s, p] = await Promise.all([getJob(jobId), listShelves(jobId), listProducts(jobId)]);
    setJob(j || null);
    setShelves(s);
    setProducts(p);
  }, [jobId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const shelfById = useMemo(() => new Map(shelves.map((s) => [s.id, s])), [shelves]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return null;
    const queryDigits = normalizeUpc(query);
    return products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(query);
      const upcMatch = queryDigits.length > 0 && p.upc.includes(queryDigits);
      return nameMatch || upcMatch;
    });
  }, [products, search]);

  const grouped = useMemo(() => {
    const byShelf = new Map();
    for (const product of products) {
      const list = byShelf.get(product.shelfId) || [];
      list.push(product);
      byShelf.set(product.shelfId, list);
    }
    return sortShelves(shelves).map((shelf) => ({ shelf, products: byShelf.get(shelf.id) || [] }));
  }, [shelves, products]);

  const handleSaveEdit = async ({ name, upc, shelf }) => {
    const target = await findOrCreateShelf(jobId, shelf);
    await updateProduct(editingProduct.id, { name, upc, shelfId: target.id });
    setEditingProduct(null);
    showToast('Producto actualizado');
    refresh();
  };

  const handleDeleteEdit = async (productId) => {
    await deleteProduct(productId);
    setEditingProduct(null);
    showToast('Producto eliminado');
    refresh();
  };

  if (job === undefined) return null;

  if (job === null) {
    return (
      <div className="screen">
        <EmptyState
          emoji="⏳"
          title="Este trabajo ya no existe"
          subtitle="Probablemente pasaron más de 48 horas y se borró automáticamente."
        >
          <BigButton as="link" to="/" variant="primary">
            Volver al inicio
          </BigButton>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Volver">
          ‹
        </button>
        <h1>{job.name}</h1>
        <CountdownChip remainingMs={remaining} />
      </div>

      <SearchBar value={search} onChange={setSearch} onScanClick={() => navigate(`/jobs/${jobId}/scan`)} />

      <div className="quick-actions">
        <BigButton variant="secondary" onClick={() => navigate(`/jobs/${jobId}/scan`)}>
          📷 Escanear
        </BigButton>
        <BigButton variant="secondary" onClick={() => setShowAddOptions(true)}>
          + Agregar
        </BigButton>
      </div>

      {filtered !== null ? (
        filtered.length === 0 ? (
          <EmptyState emoji="🔍" title="Sin resultados" subtitle="Revisa el UPC o intenta con otra palabra." />
        ) : (
          <div className="shelf-group">
            {filtered.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                shelfName={shelfById.get(product.shelfId)?.name}
                onClick={() => setEditingProduct({ ...product, shelfName: shelfById.get(product.shelfId)?.name || '' })}
              />
            ))}
          </div>
        )
      ) : products.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="Aún no hay productos"
          subtitle="Toma una foto del planogram, pega el texto o agrégalos manualmente."
        />
      ) : (
        grouped.map(({ shelf, products: shelfProducts }) => (
          <ShelfGroup
            key={shelf.id}
            shelf={shelf}
            products={shelfProducts}
            onProductClick={(product) => setEditingProduct({ ...product, shelfName: shelf.name })}
          />
        ))
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          shelfNames={shelves.map((s) => s.name)}
          onSave={handleSaveEdit}
          onDelete={handleDeleteEdit}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {showAddOptions && (
        <AddOptionsSheet
          jobId={jobId}
          onClose={() => setShowAddOptions(false)}
          onShelfCreated={() => {
            showToast('Shelf creado');
            refresh();
          }}
        />
      )}
    </div>
  );
}
