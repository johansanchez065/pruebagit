import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { listShelves, findOrCreateShelf } from '../db/shelvesRepo';
import { addProduct } from '../db/productsRepo';
import { ReviewTable } from '../components/ReviewTable';
import { BigButton } from '../components/BigButton';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../context/ToastContext';

let rowCounter = 0;
function blankRow(shelf = '') {
  return { rowId: `new-${Date.now()}-${rowCounter++}`, shelf, name: '', upc: '' };
}

export function ReviewPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();

  const [rows, setRows] = useState(location.state?.rows ?? []);
  const [shelfNames, setShelfNames] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listShelves(jobId).then((shelves) => setShelfNames(shelves.map((s) => s.name)));
  }, [jobId]);

  const changeRow = (rowId, patch) => {
    setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
  };

  const deleteRow = (rowId) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const addRow = () => {
    const lastShelf = rows[rows.length - 1]?.shelf ?? '';
    setRows((prev) => [...prev, blankRow(lastShelf)]);
  };

  const confirmSave = async () => {
    const valid = rows.filter((row) => row.name.trim());
    if (valid.length === 0) return;
    setSaving(true);
    const shelfCache = new Map();
    for (const row of valid) {
      const shelfLabel = row.shelf.trim() || 'Sin shelf';
      let shelf = shelfCache.get(shelfLabel);
      if (!shelf) {
        shelf = await findOrCreateShelf(jobId, shelfLabel);
        shelfCache.set(shelfLabel, shelf);
      }
      await addProduct({ jobId, shelfId: shelf.id, name: row.name, upc: row.upc });
    }
    showToast(`${valid.length} producto(s) guardado(s)`);
    navigate(`/jobs/${jobId}`);
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          ‹
        </button>
        <h1>Revisar antes de guardar</h1>
      </div>

      {rows.length === 0 ? (
        <EmptyState emoji="🧐" title="No hay filas" subtitle="Agrega una fila manualmente o vuelve atrás.">
          <BigButton variant="primary" onClick={addRow}>
            + Agregar fila
          </BigButton>
        </EmptyState>
      ) : (
        <>
          <p className="helper-text">
            Revisa shelf, producto y UPC. Corrige lo que la lectura automática haya fallado y elimina filas que no
            correspondan.
          </p>
          <ReviewTable rows={rows} onChangeRow={changeRow} onDeleteRow={deleteRow} onAddRow={addRow} shelfNames={shelfNames} />
          <BigButton variant="primary" disabled={saving} onClick={confirmSave}>
            {saving ? 'Guardando...' : 'Confirmar y guardar'}
          </BigButton>
        </>
      )}
    </div>
  );
}
