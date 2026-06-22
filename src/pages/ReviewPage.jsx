import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { listShelves, resolveShelvesBulk } from '../db/shelvesRepo';
import { addProductsBulk } from '../db/productsRepo';
import { ReviewTable } from '../components/ReviewTable';
import { BigButton } from '../components/BigButton';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

let rowCounter = 0;
function blankRow(shelf = '') {
  return { rowId: `new-${Date.now()}-${rowCounter++}`, shelf, name: '', upc: '' };
}

export function ReviewPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();
  const { t } = useLanguage();

  const [rows, setRows] = useState(location.state?.rows ?? []);
  const [shelfNames, setShelfNames] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listShelves(jobId).then((shelves) => setShelfNames(shelves.map((s) => s.name)));
  }, [jobId]);

  const changeRow = (rowId, patch) => {
    setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
  };

  const deleteRow = (rowId) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const addRow = () => {
    const lastShelf = rows[rows.length - 1]?.shelf ?? '';
    setRows((prev) => [...prev, blankRow(lastShelf)]);
  };

  const confirmSave = async () => {
    const valid = rows.filter((row) => row.name.trim());
    if (valid.length === 0) return;
    setSaving(true);
    // Resolves/creates every shelf in batched writes and saves every product
    // in batched writes too, instead of one sequential round trip per row —
    // a 1000+ row import would otherwise take minutes over the network.
    const shelfLabels = valid.map((row) => row.shelf.trim() || t('review.noShelfLabel'));
    const shelvesByLabel = await resolveShelvesBulk(jobId, shelfLabels);
    const items = valid.map((row, i) => ({
      shelfId: shelvesByLabel.get(shelfLabels[i]).id,
      name: row.name,
      upc: row.upc,
    }));
    await addProductsBulk(jobId, items);
    showToast(t('review.savedToast', { count: valid.length }));
    navigate(`/jobs/${jobId}`);
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('review.title')}</h1>
      </div>

      {rows.length === 0 ? (
        <EmptyState emoji="🧐" title={t('review.noRowsTitle')} subtitle={t('review.noRowsSubtitle')}>
          <BigButton variant="primary" onClick={addRow}>
            {t('review.addRow')}
          </BigButton>
        </EmptyState>
      ) : (
        <>
          <p className="helper-text">{t('review.helper')}</p>
          <ReviewTable rows={rows} onChangeRow={changeRow} onDeleteRow={deleteRow} onAddRow={addRow} shelfNames={shelfNames} />
          <BigButton variant="primary" disabled={saving} onClick={confirmSave}>
            {saving ? t('review.saving') : t('review.confirmSave')}
          </BigButton>
        </>
      )}
    </div>
  );
}
