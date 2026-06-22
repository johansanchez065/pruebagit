import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listJobs, deleteJob } from '../db/jobsRepo';
import { BigButton } from '../components/BigButton';
import { IconButton } from '../components/IconButton';
import { CountdownChip } from '../components/CountdownChip';
import { EmptyState } from '../components/EmptyState';
import { useCountdown } from '../hooks/useCountdown';
import { formatDateTime } from '../lib/time';
import { useLanguage } from '../context/LanguageContext';

function JobCard({ job, onDelete, lang, t }) {
  const remaining = useCountdown(job);
  return (
    <div className="job-card card" style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
        <div className="job-card-top">
          <div className="job-card-name">{job.name}</div>
          <CountdownChip remainingMs={remaining} />
        </div>
        <div className="job-card-meta">{t('home.created', { date: formatDateTime(job.createdAt, lang) })}</div>
      </Link>
      <IconButton variant="danger" label={t('home.deleteJobLabel')} onClick={() => onDelete(job)}>
        🗑
      </IconButton>
    </div>
  );
}

export function HomePage() {
  const { lang, setLang, t } = useLanguage();
  const [jobs, setJobs] = useState(null);

  const refresh = useCallback(() => {
    listJobs().then(setJobs);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (job) => {
    if (!window.confirm(t('home.deleteConfirm', { name: job.name }))) return;
    await deleteJob(job.id);
    refresh();
  };

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

      {jobs === null ? null : jobs.length === 0 ? (
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
