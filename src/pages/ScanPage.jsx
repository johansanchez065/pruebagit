import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { findByUpc } from '../db/productsRepo';
import { listShelves } from '../db/shelvesRepo';
import { BarcodeScannerView } from '../components/BarcodeScannerView';
import { BigButton } from '../components/BigButton';
import { useLanguage } from '../context/LanguageContext';

export function ScanPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [result, setResult] = useState(null);

  const handleDetect = useCallback(
    async (code) => {
      const product = await findByUpc(jobId, code);
      if (!product) {
        setResult({ status: 'not-found', upc: code });
        return;
      }
      const shelves = await listShelves(jobId);
      const shelf = shelves.find((s) => s.id === product.shelfId);
      setResult({ status: 'found', product, shelfName: shelf?.name || t('scan.noShelf') });
    },
    [jobId, t],
  );

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(`/jobs/${jobId}`)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('scan.title')}</h1>
      </div>

      {!result && <BarcodeScannerView onDetect={handleDetect} />}

      {result && (
        <div className="card scan-result">
          {result.status === 'found' ? (
            <>
              <div>{t('scan.found')}</div>
              <div className="product-row-name" style={{ fontSize: 20 }}>
                {result.product.name}
              </div>
              <div className="upc">UPC: {result.product.upc}</div>
              <div className="shelf-badge">{result.shelfName}</div>
            </>
          ) : (
            <>
              <div>{t('scan.notFound')}</div>
              <div className="upc">UPC: {result.upc}</div>
            </>
          )}
          <BigButton variant="primary" onClick={() => setResult(null)}>
            {t('scan.keepScanning')}
          </BigButton>
        </div>
      )}
    </div>
  );
}
