import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { parseSheetText } from '../lib/parseSheetText';
import { BigButton } from '../components/BigButton';
import { useLanguage } from '../context/LanguageContext';

export function PasteTextPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [text, setText] = useState('');

  const handleProcess = () => {
    const rows = parseSheetText(text);
    navigate(`/jobs/${jobId}/review`, { state: { rows } });
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
