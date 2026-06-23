import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { parseSheetText } from '../lib/parseSheetText';
import { listShelves } from '../db/shelvesRepo';
import { BigButton } from '../components/BigButton';
import { useLanguage } from '../context/LanguageContext';

export function PasteTextPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [shelf, setShelf] = useState('');
  const [shelfNames, setShelfNames] = useState([]);

  useEffect(() => {
    listShelves(jobId).then((shelves) => setShelfNames(shelves.map((s) => s.name)));
  }, [jobId]);

  const handleProcess = () => {
    const { rows, warnings } = parseSheetText(text, { defaultShelf: shelf.trim() });
    navigate(`/jobs/${jobId}/review`, { state: { rows, warnings } });
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('pasteText.title')}</h1>
      </div>

      <p className="helper-text">{t('pasteText.helper')}</p>

      <div className="field-group">
        <label htmlFor="paste-text-shelf">{t('photoOcr.shelfLabel')}</label>
        <input
          id="paste-text-shelf"
          list="paste-text-shelf-options"
          placeholder={t('photoOcr.shelfPlaceholder')}
          value={shelf}
          onChange={(e) => setShelf(e.target.value)}
        />
        <datalist id="paste-text-shelf-options">
          {shelfNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <textarea
        className="mono"
        placeholder={t('pasteText.example')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />

      <BigButton variant="primary" disabled={!text.trim()} onClick={handleProcess}>
        {t('pasteText.process')}
      </BigButton>
    </div>
  );
}
