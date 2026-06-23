import { useLanguage } from '../context/LanguageContext';

export function ProgressSummary({ stats, onClick }) {
  const { t } = useLanguage();
  return (
    <button type="button" className="progress-summary" onClick={onClick}>
      <div className="progress-summary-bar">
        <div className="progress-summary-fill" style={{ width: `${stats.percent}%` }} />
      </div>
      <div className="progress-summary-text">
        {t('progress.summary', { found: stats.found, total: stats.total, percent: stats.percent })}
      </div>
    </button>
  );
}
