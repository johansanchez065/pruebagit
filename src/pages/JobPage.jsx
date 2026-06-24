import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { subscribeJob, deleteJob } from '../db/jobsRepo';
import { subscribeShelves, findOrCreateShelf } from '../db/shelvesRepo';
import { subscribeProducts, updateProduct, deleteProduct, setProductStatus } from '../db/productsRepo';
import { listSearchHistory, recordSearch } from '../db/searchHistoryRepo';
import { normalizeUpc } from '../lib/upc';
import { sortShelves } from '../lib/shelfSort';
import { getDisplayName, setDisplayName } from '../lib/identity';
import { BigButton } from '../components/BigButton';
import { IconButton } from '../components/IconButton';
import { CountdownChip } from '../components/CountdownChip';
import { SearchBar } from '../components/SearchBar';
import { ShelfGroup } from '../components/ShelfGroup';
import { ProductRow } from '../components/ProductRow';
import { ProductMatchCard } from '../components/ProductMatchCard';
import { ProgressSummary } from '../components/ProgressSummary';
import { ProductEditModal } from '../components/ProductEditModal';
import { AddOptionsSheet } from '../components/AddOptionsSheet';
import { EmptyState } from '../components/EmptyState';
import { NamePrompt } from '../components/NamePrompt';
import { JobQrModal } from '../components/JobQrModal';
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
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  const remaining = useCountdown(job || null);

  // Realtime listeners instead of a one-shot fetch + manual refresh(): a
  // teammate's change on another phone shows up here automatically.
  useEffect(() => {
    const unsubJob = subscribeJob(jobId, setJob);
    const unsubShelves = subscribeShelves(jobId, setShelves);
    const unsubProducts = subscribeProducts(jobId, setProducts);
    listSearchHistory(jobId).then(setHistory);
    return () => {
      unsubJob();
      unsubShelves();
      unsubProducts();
    };
  }, [jobId]);

  const shelfById = useMemo(() => new Map(shelves.map((s) => [s.id, s])), [shelves]);

  const trimmedSearch = search.trim();

  // Matches full UPC, any UPC substring (which covers "last 4/5/6 digits"
  // since that's just a suffix substring), description, position, or shelf
  // name — whichever the merchandiser happened to type.
  const filtered = useMemo(() => {
    const query = trimmedSearch.toLowerCase();
    if (!query) return null;
    const queryDigits = normalizeUpc(query);
    return products.filter((p) => {
      const upcStr = String(p.upc || '');
      const descMatch = p.description.toLowerCase().includes(query);
      const upcMatch = queryDigits.length > 0 && (upcStr.includes(queryDigits) || upcStr.endsWith(queryDigits));
      const positionMatch = p.position && p.position.toLowerCase().includes(query);
      const shelfName = shelfById.get(p.shelfId)?.name || '';
      const shelfMatch = shelfName.toLowerCase().includes(query);
      return descMatch || upcMatch || positionMatch || shelfMatch;
    });
  }, [products, trimmedSearch, shelfById]);

  const singleMatch = filtered && filtered.length === 1 ? filtered[0] : null;

  // A search that narrows to exactly one product is worth remembering —
  // logged once per distinct product, not on every keystroke that still
  // resolves to the same one.
  useEffect(() => {
    if (!singleMatch) return;
    const shelfName = shelfById.get(singleMatch.shelfId)?.name || '';
    recordSearch(jobId, singleMatch, shelfName).then(() => {
      listSearchHistory(jobId).then(setHistory);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleMatch?.id, jobId]);

  const grouped = useMemo(() => {
    const byShelf = new Map();
    for (const product of products) {
      const list = byShelf.get(product.shelfId) || [];
      list.push(product);
      byShelf.set(product.shelfId, list);
    }
    return sortShelves(shelves).map((shelf) => ({ shelf, products: byShelf.get(shelf.id) || [] }));
  }, [shelves, products]);

  const stats = useMemo(() => {
    const total = products.length;
    const found = products.filter((p) => p.status === 'found').length;
    const notFound = products.filter((p) => p.status === 'not_found').length;
    const pending = total - found - notFound;
    const percent = total > 0 ? Math.round((found / total) * 100) : 0;
    return { total, found, notFound, pending, percent };
  }, [products]);

  const handleSaveEdit = async ({ description, upc, shelf, position, stockcode, size, uom, facings }) => {
    try {
      const target = await findOrCreateShelf(jobId, shelf);
      await updateProduct(jobId, editingProduct.id, {
        description,
        upc,
        shelfId: target.id,
        position,
        stockcode,
        size,
        uom,
        facings,
      });
      setEditingProduct(null);
      showToast(t('job.productUpdated'));
    } catch {
      showToast(t('common.saveError'));
    }
  };

  const handleDeleteEdit = async (productId) => {
    try {
      await deleteProduct(jobId, productId);
      setEditingProduct(null);
      showToast(t('job.productDeleted'));
    } catch {
      showToast(t('common.saveError'));
    }
  };

  const applyStatus = async (product, status, name) => {
    try {
      await setProductStatus(jobId, product.id, status, name);
    } catch {
      showToast(t('common.saveError'));
    }
  };

  // Lazy identity: the name is only ever asked for right before the first
  // status tap, never up front — skipping locks in a fallback so the prompt
  // never interrupts again.
  const handleSetStatus = (product, status) => {
    const name = getDisplayName();
    if (!name) {
      setPendingStatus({ product, status });
      return;
    }
    applyStatus(product, status, name);
  };

  const handleNameConfirm = (name) => {
    setDisplayName(name);
    const pending = pendingStatus;
    setPendingStatus(null);
    if (pending) applyStatus(pending.product, pending.status, name);
  };

  const handleNameSkip = () => {
    const fallback = t('namePrompt.fallbackName');
    setDisplayName(fallback);
    const pending = pendingStatus;
    setPendingStatus(null);
    if (pending) applyStatus(pending.product, pending.status, fallback);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(jobId);
      showToast(t('job.codeCopied'));
    } catch {
      // Clipboard access can be denied; the code is already visible in the chip.
    }
  };

  // Same delete + confirm as the HomePage job card, but reachable without
  // leaving the job — needed mid-test when an OCR import comes out wrong and
  // the fastest fix is wiping the job and re-importing from zero.
  const handleDeleteJob = async () => {
    if (!window.confirm(t('home.deleteConfirm', { name: job.name }))) return;
    try {
      await deleteJob(jobId);
      navigate('/');
    } catch {
      showToast(t('common.saveError'));
    }
  };

  const openEdit = (product) => {
    setEditingProduct({ ...product, shelfName: shelfById.get(product.shelfId)?.name || '' });
  };

  const handleHistoryClick = (entry) => {
    setSearch(entry.upc || entry.description);
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
        <button
          className="back-btn"
          onClick={() => navigate('/', { state: { skipAutoOpen: true } })}
          aria-label={t('common.back')}
        >
          ‹
        </button>
        <h1>{job.name}</h1>
        <CountdownChip remainingMs={remaining} />
      </div>

      <div className="job-code-row">
        <button type="button" className="job-code-chip" onClick={handleCopyCode}>
          {t('job.codeLabel', { code: jobId })}
        </button>
        <IconButton label={t('job.showQr')} onClick={() => setShowQr(true)}>
          ▦
        </IconButton>
        <IconButton variant="danger" label={t('home.deleteJobLabel')} onClick={handleDeleteJob}>
          🗑
        </IconButton>
      </div>

      <SearchBar value={search} onChange={setSearch} onScanClick={() => navigate(`/jobs/${jobId}/scan`)} />

      <div className="quick-actions">
        <BigButton variant="secondary" onClick={() => navigate(`/jobs/${jobId}/scan`)}>
          {t('job.scan')}
        </BigButton>
        <BigButton variant="secondary" onClick={() => setShowAddOptions(true)}>
          {t('job.add')}
        </BigButton>
      </div>

      {!trimmedSearch && history.length > 0 && (
        <div className="history-block">
          <div className="history-label">{t('job.recentSearchesLabel')}</div>
          <div className="history-row">
            {history.map((entry) => (
              <button key={entry.id} type="button" className="history-chip" onClick={() => handleHistoryClick(entry)}>
                {entry.description || entry.upc}
              </button>
            ))}
          </div>
        </div>
      )}

      {!trimmedSearch && stats.total > 0 && (
        <ProgressSummary stats={stats} onClick={() => navigate(`/jobs/${jobId}/report`)} />
      )}

      {filtered !== null ? (
        filtered.length === 0 ? (
          <EmptyState emoji="🔍" title={t('job.noResultsTitle')} subtitle={t('job.noResultsSubtitle')} />
        ) : singleMatch ? (
          <ProductMatchCard
            product={singleMatch}
            shelfName={shelfById.get(singleMatch.shelfId)?.name}
            onClick={() => openEdit(singleMatch)}
            onSetStatus={handleSetStatus}
          />
        ) : (
          <div className="shelf-group">
            {filtered.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                shelfName={shelfById.get(product.shelfId)?.name}
                onClick={() => openEdit(product)}
                onSetStatus={handleSetStatus}
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
            onProductClick={openEdit}
            onSetStatus={handleSetStatus}
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

      {showQr && <JobQrModal code={jobId} onClose={() => setShowQr(false)} />}

      {pendingStatus && <NamePrompt onConfirm={handleNameConfirm} onSkip={handleNameSkip} />}
    </div>
  );
}
