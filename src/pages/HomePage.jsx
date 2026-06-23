import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listRecentJobs, deleteJob, joinJob } from '../db/jobsRepo';
import { BigButton } from '../components/BigButton';
import { IconButton } from '../components/IconButton';
import { CountdownChip } from '../components/CountdownChip';
import { EmptyState } from '../components/EmptyState';
import { BarcodeScannerView } from '../components/BarcodeScannerView';
import { useCountdown } from '../hooks/useCountdown';
import { formatDateTime } from '../lib/time';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

function JobCard({ job, onDelete, lang, t }) {
  const remaining = useCountdown(job);
  return (
    <div className="job-card card" style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
        <div className="job-card-top">
          <div className="job-card-name">{job.name}</div>
          <CountdownChip remainingMs={remaining} />
        </div>
        <div className="job-card-meta">
          {t('home.codeAndCreated', { code: job.id, date: formatDateTime(job.createdAt, lang) })}
        </div>
      </Link>
      <IconButton variant="danger" label={t('home.deleteJobLabel')} onClick={() => onDelete(job)}>
        🗑
      </IconButton>
    </div>
  );
}

export function HomePage() {
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const showToast = useToast();
  const [jobs, setJobs] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [scanningQr, setScanningQr] = useState(false);

  const refresh = () => {
    listRecentJobs().then(setJobs);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = async (job) => {
    if (!window.confirm(t('home.deleteConfirm', { name: job.name }))) return;
    try {
      await deleteJob(job.id);
      refresh();
    } catch {
      showToast(t('common.saveError'));
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || joining) return;
    setJoining(true);
    try {
      const job = await joinJob(joinCode);
      if (!job) {
        showToast(t('home.joinNotFound'));
        return;
      }
      navigate(`/jobs/${job.id}`);
    } catch {
      showToast(t('common.loadError'));
    } finally {
      setJoining(false);
    }
  };

  const handleQrDetect = useCallback(
    async (code) => {
      setScanningQr(false);
      setJoining(true);
      try {
        const job = await joinJob(code);
        if (!job) {
          showToast(t('home.joinNotFound'));
          return;
        }
        navigate(`/jobs/${job.id}`);
      } catch {
        showToast(t('common.loadError'));
      } finally {
        setJoining(false);
      }
    },
    [navigate, showToast, t],
  );

  return (
    <div className="screen">
      <div className="app-header">
        <h1>Shelf Finder</h1>
        <IconButton
          label={t('home.languageToggleLabel')}
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        >
          {lang === 'en' ? 'ES' : 'EN'}
        </IconButton>
      </div>

      <div className="join-row">
        <input
          placeholder={t('home.joinPlaceholder')}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          maxLength={6}
        />
        <IconButton label={t('home.scanQr')} onClick={() => setScanningQr(true)}>
          📷
        </IconButton>
        <button
          type="button"
          className="big-btn big-btn--secondary join-btn"
          disabled={!joinCode.trim() || joining}
          onClick={handleJoin}
        >
          {t('home.join')}
        </button>
      </div>

      {scanningQr && (
        <div className="modal-overlay" onClick={() => setScanningQr(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{t('home.scanQrTitle')}</h2>
            <BarcodeScannerView mode="qr" onDetect={handleQrDetect} />
            <BigButton variant="ghost" onClick={() => setScanningQr(false)}>
              {t('common.back')}
            </BigButton>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState emoji="🗂️" title={t('home.emptyTitle')} subtitle={t('home.emptySubtitle')} />
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onDelete={handleDelete} lang={lang} t={t} />
          ))}
        </div>
      )}

      <div className="fab-row">
        <BigButton as="link" to="/jobs/new" variant="primary">
          {t('home.newJob')}
        </BigButton>
      </div>
    </div>
  );
}
