import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../db/jobsRepo';
import { BigButton } from '../components/BigButton';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export function NewJobPage() {
  const { t } = useLanguage();
  const showToast = useToast();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const job = await createJob(name);
      navigate(`/jobs/${job.id}`, { replace: true });
    } catch {
      showToast(t('common.saveError'));
      setCreating(false);
    }
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('newJob.title')}</h1>
      </div>

      <div className="field-group">
        <label htmlFor="job-name">{t('newJob.nameLabel')}</label>
        <input
          id="job-name"
          autoFocus
          placeholder={t('newJob.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
      </div>
      <p className="helper-text">{t('newJob.helper')}</p>

      <BigButton variant="primary" disabled={!name.trim() || creating} onClick={handleCreate}>
        {t('newJob.create')}
      </BigButton>
    </div>
  );
}
