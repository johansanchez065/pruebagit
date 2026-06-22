import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../db/jobsRepo';
import { BigButton } from '../components/BigButton';

export function NewJobPage() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) return;
    const job = await createJob(name);
    navigate(`/jobs/${job.id}`, { replace: true });
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          ‹
        </button>
        <h1>Nuevo trabajo</h1>
      </div>

      <div className="field-group">
        <label htmlFor="job-name">Nombre del trabajo</label>
        <input
          id="job-name"
          autoFocus
          placeholder="Set pañales Walmart tienda 14"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
      </div>
      <p className="helper-text">
        Este trabajo y todos sus productos se borrarán automáticamente 48 horas después de crearlo.
      </p>

      <BigButton variant="primary" disabled={!name.trim()} onClick={handleCreate}>
        Crear trabajo
      </BigButton>
    </div>
  );
}
