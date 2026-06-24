import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { listShelves, resolveShelvesBulk, getLastUsedShelfName } from '../db/shelvesRepo';
import { addProductsBulk } from '../db/productsRepo';
import { countMissingShelf, applyShelfToMissingRows as mergeShelfIntoRows } from '../lib/shelfContinuation';
import { ReviewTable } from '../components/ReviewTable';
import { BigButton } from '../components/BigButton';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

let rowCounter = 0;
function blankRow(shelf = '') {
  return {
    rowId: `new-${Date.now()}-${rowCounter++}`,
    shelf,
    position: '',
    description: '',
    upc: '',
    stockcode: '',
    size: '',
    uom: '',
    facings: '',
  };
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
  const [lastShelfName, setLastShelfName] = useState('');
  const [choosingShelf, setChoosingShelf] = useState(false);
  const [chosenShelf, setChosenShelf] = useState('');
  const parseWarnings = location.state?.warnings ?? [];

  useEffect(() => {
    listShelves(jobId).then((shelves) => setShelfNames(shelves.map((s) => s.name)));
    getLastUsedShelfName(jobId).then(setLastShelfName);
  }, [jobId]);

  // A continuation page (rows that came in with no "Shelf:" header and no
  // manual default typed before import) leaves these rows shelf-less — offer
  // to bulk-assign the shelf the job was last imported into instead of
  // making the user fix every row by hand. Once every row has a shelf
  // (whether from that bulk action or manual edits), the prompt drops away.
  const missingShelfCount = useMemo(() => countMissingShelf(rows), [rows]);
  const showContinuationPrompt = missingShelfCount > 0 && lastShelfName.trim().length > 0;

  const applyShelfToMissingRows = (shelfName) => {
    setRows((prev) => mergeShelfIntoRows(prev, shelfName));
    setChoosingShelf(false);
    setChosenShelf('');
  };

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
    // A row only needs a description OR a upc to be worth keeping — a
    // completely untouched blank row (added by mistake) is the only thing
    // silently dropped here.
    const valid = rows.filter((row) => row.description.trim() || row.upc.trim());
    if (valid.length === 0) return;
    setSaving(true);
    try {
      // Resolves/creates every shelf in batched writes and saves every
      // product in batched writes too, instead of one sequential round trip
      // per row — a 1000+ row import would otherwise take minutes over the
      // network. Shelves that already exist get reused, never duplicated.
      const shelfLabels = valid.map((row) => row.shelf.trim() || t('review.noShelfLabel'));
      const shelvesByLabel = await resolveShelvesBulk(jobId, shelfLabels);
      const items = valid.map((row, i) => ({
        shelfId: shelvesByLabel.get(shelfLabels[i]).id,
        description: row.description,
        upc: row.upc,
        position: row.position,
        stockcode: row.stockcode,
        size: row.size,
        uom: row.uom,
        facings: row.facings,
      }));
      await addProductsBulk(jobId, items);
      showToast(t('review.savedToast', { count: valid.length }));
      navigate(`/jobs/${jobId}`);
    } catch {
      showToast(t('common.saveError'));
      setSaving(false);
    }
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('review.title')}</h1>
      </div>

      {parseWarnings.length > 0 && (
        <div className="card">
          {parseWarnings.map((warning, i) => (
            <p key={i} className="helper-text">
              {t(warning.key, warning.params)}
            </p>
          ))}
        </div>
      )}

      {showContinuationPrompt && (
        <div className="card">
          <p className="helper-text">{t('review.continuation.message', { shelf: lastShelfName })}</p>
          {choosingShelf ? (
            <div className="field-group">
              <input
                list="review-continuation-shelf-options"
                placeholder={t('review.continuation.placeholder')}
                value={chosenShelf}
                onChange={(e) => setChosenShelf(e.target.value)}
                autoFocus
              />
              <datalist id="review-continuation-shelf-options">
                {shelfNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <BigButton
                variant="primary"
                disabled={!chosenShelf.trim()}
                onClick={() => applyShelfToMissingRows(chosenShelf.trim())}
              >
                {t('review.continuation.apply')}
              </BigButton>
            </div>
          ) : (
            <div className="quick-actions">
              <BigButton variant="primary" onClick={() => applyShelfToMissingRows(lastShelfName)}>
                {t('review.continuation.continueButton', { shelf: lastShelfName })}
              </BigButton>
              <BigButton variant="secondary" onClick={() => setChoosingShelf(true)}>
                {t('review.continuation.chooseAnother')}
              </BigButton>
            </div>
          )}
        </div>
      )}

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
