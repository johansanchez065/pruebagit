import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { recognizeSheetText } from '../lib/ocr';
import { parseSheetText } from '../lib/parseSheetText';
import { BigButton } from '../components/BigButton';
import { useLanguage } from '../context/LanguageContext';

export function PhotoOcrPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | recognizing | done | error
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setStatus('recognizing');
    setProgress(0);
    try {
      const recognized = await recognizeSheetText(file, { onProgress: setProgress });
      setText(recognized);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const handleContinue = () => {
    const rows = parseSheetText(text);
    navigate(`/jobs/${jobId}/review`, { state: { rows } });
  };

  const retake = () => {
    setPreviewUrl(null);
    setStatus('idle');
    setText('');
    fileInputRef.current?.click();
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('photoOcr.title')}</h1>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {status === 'idle' && (
        <>
          <p className="helper-text">{t('photoOcr.helperIdle')}</p>
          <BigButton variant="primary" onClick={() => fileInputRef.current?.click()}>
            {t('photoOcr.takePhoto')}
          </BigButton>
        </>
      )}

      {previewUrl && (
        <img
          src={previewUrl}
          alt={t('photoOcr.imageAlt')}
          style={{ width: '100%', borderRadius: 16, maxHeight: 240, objectFit: 'cover' }}
        />
      )}

      {status === 'recognizing' && (
        <div className="card center-text">
          <p>{t('photoOcr.recognizing', { progress: Math.round(progress * 100) })}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="card center-text">
          <p>{t('photoOcr.errorMessage')}</p>
          <BigButton variant="secondary" onClick={retake}>
            {t('photoOcr.retry')}
          </BigButton>
        </div>
      )}

      {status === 'done' && (
        <>
          <p className="helper-text">{t('photoOcr.helperDone')}</p>
          <textarea className="mono" value={text} onChange={(e) => setText(e.target.value)} />
          <BigButton variant="primary" onClick={handleContinue}>
            {t('photoOcr.continueToReview')}
          </BigButton>
          <BigButton variant="ghost" onClick={retake}>
            {t('photoOcr.retakePhoto')}
          </BigButton>
        </>
      )}
    </div>
  );
}
