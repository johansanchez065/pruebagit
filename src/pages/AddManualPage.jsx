import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listShelves, findOrCreateShelf } from '../db/shelvesRepo';
import { addProduct } from '../db/productsRepo';
import { BigButton } from '../components/BigButton';
import { useToast } from '../context/ToastContext';

export function AddManualPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [shelf, setShelf] = useState('');
  const [name, setName] = useState('');
  const [upc, setUpc] = useState('');
  const [shelfNames, setShelfNames] = useState([]);

  useEffect(() => {
    listShelves(jobId).then((shelves) => setShelfNames(shelves.map((s) => s.name)));
  }, [jobId]);

  const valid = shelf.trim() && name.trim();

  const save = async ({ andContinue }) => {
    if (!valid) return;
    const targetShelf = await findOrCreateShelf(jobId, shelf);
    await addProduct({ jobId, shelfId: targetShelf.id, name, upc });
    showToast('Producto agregado');
    if (andContinue) {
      setName('');
      setUpc('');
      if (!shelfNames.includes(targetShelf.name)) setShelfNames((prev) => [...prev, targetShelf.name]);
    } else {
      navigate(`/jobs/${jobId}`);
    }
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          ‹
        </button>
        <h1>Agregar manual</h1>
      </div>

      <div className="field-group">
        <label htmlFor="manual-shelf">Shelf</label>
        <input
          id="manual-shelf"
          list="manual-shelf-options"
          placeholder="Shelf 3"
          value={shelf}
          onChange={(e) => setShelf(e.target.value)}
        />
        <datalist id="manual-shelf-options">
          {shelfNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="field-group">
        <label htmlFor="manual-name">Producto</label>
        <input id="manual-name" placeholder="Pañitos húmedos" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field-group">
        <label htmlFor="manual-upc">UPC</label>
        <input
          id="manual-upc"
          inputMode="numeric"
          placeholder="483823747292"
          value={upc}
          onChange={(e) => setUpc(e.target.value)}
        />
      </div>

      <BigButton variant="primary" disabled={!valid} onClick={() => save({ andContinue: false })}>
        Guardar
      </BigButton>
      <BigButton variant="secondary" disabled={!valid} onClick={() => save({ andContinue: true })}>
        Guardar y agregar otro
      </BigButton>
    </div>
  );
}
