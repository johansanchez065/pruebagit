import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getJob } from '../db/jobsRepo';
import { listShelves } from '../db/shelvesRepo';
import { listProducts } from '../db/productsRepo';
import { buildReportText, buildShelfBreakdown } from '../lib/report';
import { getDisplayName } from '../lib/identity';
import { BigButton } from '../components/BigButton';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export function ReportPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const showToast = useToast();

  const [job, setJob] = useState(null);
  const [shelves, setShelves] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    Promise.all([getJob(jobId), listShelves(jobId), listProducts(jobId)]).then(([jobData, shelfData, productData]) => {
      setJob(jobData);
      setShelves(shelfData);
      setProducts(productData);
    });
  }, [jobId]);

  const breakdown = useMemo(() => buildShelfBreakdown(shelves, products), [shelves, products]);
  const notFoundList = useMemo(() => products.filter((p) => p.status === 'not_found'), [products]);
  const shelfById = useMemo(() => new Map(shelves.map((s) => [s.id, s])), [shelves]);

  const total = products.length;
  const found = products.filter((p) => p.status === 'found').length;
  const pending = total - found - notFoundList.length;

  const handleCopy = async () => {
    if (!job) return;
    const text = buildReportText({
      job,
      products,
      shelves,
      displayName: getDisplayName() || t('namePrompt.fallbackName'),
      lang,
      t,
    });
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('report.copied'));
    } catch {
      showToast(t('common.saveError'));
    }
  };

  if (!job) return null;

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('report.title')}</h1>
      </div>

      <div className="card report-stats">
        <div className="report-stat">
          <strong>{total}</strong>
          <span>{t('report.statTotal')}</span>
        </div>
        <div className="report-stat">
          <strong>{found}</strong>
          <span>{t('report.statFound')}</span>
        </div>
        <div className="report-stat">
          <strong>{pending}</strong>
          <span>{t('report.statPending')}</span>
        </div>
        <div className="report-stat">
          <strong>{notFoundList.length}</strong>
          <span>{t('report.statNotFound')}</span>
        </div>
      </div>

      <div className="card">
        <div className="report-section-title">{t('report.breakdownTitle')}</div>
        {breakdown.map(({ shelf, found: shelfFound, total: shelfTotal }) => (
          <div className="report-breakdown-row" key={shelf.id}>
            <span>{shelf.name}</span>
            <span>
              {shelfFound}/{shelfTotal}
            </span>
          </div>
        ))}
      </div>

      {notFoundList.length > 0 && (
        <div className="card">
          <div className="report-section-title">{t('report.notFoundTitle')}</div>
          {notFoundList.map((p) => (
            <div className="report-notfound-row" key={p.id}>
              {p.upc || '—'} - {p.description} - {shelfById.get(p.shelfId)?.name || ''} - {p.position || '—'}
            </div>
          ))}
        </div>
      )}

      <BigButton variant="primary" onClick={handleCopy}>
        {t('report.copy')}
      </BigButton>
    </div>
  );
}
