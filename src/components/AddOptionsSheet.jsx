import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findOrCreateShelf } from '../db/shelvesRepo';
import { BigButton } from './BigButton';

export function AddOptionsSheet({ jobId, onClose, onShelfCreated }) {
  const navigate = useNavigate();
  const [creatingShelf, setCreatingShelf] = useState(false);
  const [shelfName, setShelfName] = useState('');

  const handleCreateShelf = async () => {
    if (!shelfName.trim()) return;
    await findOrCreateShelf(jobId, shelfName);
    onShelfCreated?.();
    onClose();
  };

  if (creatingShelf) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <h2>Nuevo shelf</h2>
          <div className="field-group">
            <label htmlFor="new-shelf-name">Nombre del shelf</label>
            <input
              id="new-shelf-name"
              autoFocus
              placeholder="Shelf 5"
              value={shelfName}
              onChange={(e) => setShelfName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateShelf()}
            />
          </div>
          <BigButton variant="primary" disabled={!shelfName.trim()} onClick={handleCreateShelf}>
            Crear shelf
          </BigButton>
          <BigButton variant="ghost" onClick={() => setCreatingShelf(false)}>
            Volver
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Agregar productos</h2>
        <BigButton variant="primary" onClick={() => navigate(`/jobs/${jobId}/add/photo`)}>
          📷 Tomar foto (OCR)
        </BigButton>
        <BigButton variant="secondary" onClick={() => navigate(`/jobs/${jobId}/add/paste`)}>
          📋 Pegar texto
        </BigButton>
        <BigButton variant="secondary" onClick={() => navigate(`/jobs/${jobId}/add/manual`)}>
          ✏️ Agregar manual
        </BigButton>
        <BigButton variant="secondary" onClick={() => setCreatingShelf(true)}>
          🗂️ Crear shelf vacío
        </BigButton>
        <BigButton variant="ghost" onClick={onClose}>
          Cancelar
        </BigButton>
      </div>
    </div>
  );
}
