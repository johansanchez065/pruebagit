import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BigButton } from './BigButton';
import { useLanguage } from '../context/LanguageContext';

export function JobQrModal({ code, onClose }) {
  const { t } = useLanguage();
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(code, { width: 280, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet center-text" onClick={(e) => e.stopPropagation()}>
        <h2>{t('job.qrTitle')}</h2>
        {dataUrl && (
          <img
            src={dataUrl}
            alt={t('job.qrAlt')}
            width={280}
            height={280}
            style={{ alignSelf: 'center', borderRadius: 12 }}
          />
        )}
        <div className="job-code-chip" style={{ alignSelf: 'center' }}>
          {code}
        </div>
        <p className="helper-text">{t('job.qrHelper')}</p>
        <BigButton variant="ghost" onClick={onClose}>
          {t('common.back')}
        </BigButton>
      </div>
    </div>
  );
}
