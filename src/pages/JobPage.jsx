import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { subscribeJob } from '../db/jobsRepo';
import { subscribeShelves, findOrCreateShelf } from '../db/shelvesRepo';
import { subscribeProducts, updateProduct, deleteProduct } from '../db/productsRepo';
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
import { useLanguage } from '../context/LanguageContext';

export function JobPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { t } = useLanguage();

  const [job, setJob] = useState(undefined);
  const [shelves, setShelves] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const remaining = useCountdown(job || null);

  // Realtime listeners instead of a one-shot fetch + manual refresh(): a
  // teammate's change on another phone shows up here automatically.
  useEffect(() => {
    const unsubJob = subscribeJob(jobId, setJob);
    const unsubShelves = subscribeShelves(jobId, setShelves);
    const unsubProducts = subscribeProducts(jobId, setProducts);
    return () => {
      unsubJob();
      unsubShelves();
      unsubProducts();
    };
  }, [jobId]);

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
    await updateProduct(jobId, editingProduct.id, { name, upc, shelfId: target.id });
    setEditingProduct(null);
    showToast(t('job.productUpdated'));
  };

  const handleDeleteEdit = async (productId) => {
    await deleteProduct(jobId, productId);
    setEditingProduct(null);
    showToast(t('job.productDeleted'));
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(jobId);
      showToast(t('job.codeCopied'));
    } catch {
      // Clipboard access can be denied; the code is already visible in the chip.
    }
  };

  if (job === undefined) return null;

  if (job === null) {
    return (
      <div className="screen">
        <EmptyState emoji="⏳" title={t('job.expiredTitle')} subtitle={t('job.expiredSubtitle')}>
          <BigButton as="link" to="/" variant="primary">
            {t('job.backHome')}
          </BigButton>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{job.name}</h1>
        <CountdownChip remainingMs={remaining} />
      </div>

      <button type="button" className="job-code-chip" onClick={handleCopyCode}>
        {t('job.codeLabel', { code: jobId })}
      </button>

      <SearchBar value={search} onChange={setSearch} onScanClick={() => navigate(`/jobs/${jobId}/scan`)} />

      <div className="quick-actions">
        <BigButton variant="secondary" onClick={() => navigate(`/jobs/${jobId}/scan`)}>
          {t('job.scan')}
        </BigButton>
        <BigButton variant="secondary" onClick={() => setShowAddOptions(true)}>
          {t('job.add')}
        </BigButton>
      </div>

      {filtered !== null ? (
        filtered.length === 0 ? (
          <EmptyState emoji="🔍" title={t('job.noResultsTitle')} subtitle={t('job.noResultsSubtitle')} />
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
        <EmptyState emoji="📦" title={t('job.noProductsTitle')} subtitle={t('job.noProductsSubtitle')} />
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
          onShelfCreated={() => showToast(t('job.shelfCreated'))}
        />
      )}
    </div>
  );
}
