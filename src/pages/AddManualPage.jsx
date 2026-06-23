import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listShelves, findOrCreateShelf } from '../db/shelvesRepo';
import { addProduct } from '../db/productsRepo';
import { BigButton } from '../components/BigButton';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export function AddManualPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { t } = useLanguage();

  const [shelf, setShelf] = useState('');
  const [name, setName] = useState('');
  const [upc, setUpc] = useState('');
  const [shelfNames, setShelfNames] = useState([]);

  useEffect(() => {
    listShelves(jobId).then((shelves) => setShelfNames(shelves.map((s) => s.name)));
  }, [jobId]);

  const valid = shelf.trim() && name.trim();

  const save = async ({ andContinue }) => {
    if (!valid) return;
    try {
      const targetShelf = await findOrCreateShelf(jobId, shelf);
      await addProduct({ jobId, shelfId: targetShelf.id, name, upc });
      showToast(t('addManual.productAdded'));
      if (andContinue) {
        setName('');
        setUpc('');
        if (!shelfNames.includes(targetShelf.name)) setShelfNames((prev) => [...prev, targetShelf.name]);
      } else {
        navigate(`/jobs/${jobId}`);
      }
    } catch {
      showToast(t('common.saveError'));
    }
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('addManual.title')}</h1>
      </div>

      <div className="field-group">
        <label htmlFor="manual-shelf">{t('addManual.shelfLabel')}</label>
        <input
          id="manual-shelf"
          list="manual-shelf-options"
          placeholder={t('addManual.shelfPlaceholder')}
          value={shelf}
          onChange={(e) => setShelf(e.target.value)}
        />
        <datalist id="manual-shelf-options">
          {shelfNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="field-group">
        <label htmlFor="manual-name">{t('addManual.productLabel')}</label>
        <input
          id="manual-name"
          placeholder={t('addManual.productPlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field-group">
        <label htmlFor="manual-upc">{t('addManual.upcLabel')}</label>
        <input
          id="manual-upc"
          inputMode="numeric"
          placeholder={t('addManual.upcPlaceholder')}
          value={upc}
          onChange={(e) => setUpc(e.target.value)}
        />
      </div>

      <BigButton variant="primary" disabled={!valid} onClick={() => save({ andContinue: false })}>
        {t('addManual.save')}
      </BigButton>
      <BigButton variant="secondary" disabled={!valid} onClick={() => save({ andContinue: true })}>
        {t('addManual.saveAndAddAnother')}
      </BigButton>
    </div>
  );
}
