import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listJobs, deleteJob } from '../db/jobsRepo';
import { BigButton } from '../components/BigButton';
import { IconButton } from '../components/IconButton';
import { CountdownChip } from '../components/CountdownChip';
import { EmptyState } from '../components/EmptyState';
import { useCountdown } from '../hooks/useCountdown';
import { formatDateTime } from '../lib/time';

function JobCard({ job, onDelete }) {
  const remaining = useCountdown(job);
  return (
    <div className="job-card card" style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
        <div className="job-card-top">
          <div className="job-card-name">{job.name}</div>
          <CountdownChip remainingMs={remaining} />
        </div>
        <div className="job-card-meta">Creado {formatDateTime(job.createdAt)}</div>
      </Link>
      <IconButton variant="danger" label="Eliminar trabajo (por error de creación)" onClick={() => onDelete(job)}>
        🗑
      </IconButton>
    </div>
  );
}

export function HomePage() {
  const [jobs, setJobs] = useState(null);

  const refresh = useCallback(() => {
    listJobs().then(setJobs);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (job) => {
    if (!window.confirm(`¿Eliminar "${job.name}"? Esto borra todos sus productos.`)) return;
    await deleteJob(job.id);
    refresh();
  };

  return (
    <div className="screen">
      <div className="app-header">
        <h1>Shelf Finder</h1>
      </div>

      {jobs === null ? null : jobs.length === 0 ? (
        <EmptyState
          emoji="🗂️"
          title="Sin trabajos activos"
          subtitle="Crea un trabajo por cada tienda o set que vayas a hacer. Se borra solo a las 48 horas."
        />
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div className="fab-row">
        <BigButton as="link" to="/jobs/new" variant="primary">
          + Nuevo trabajo
        </BigButton>
      </div>
    </div>
  );
}
