import { useState } from 'react';
import { BigButton } from './BigButton';

export function ProductEditModal({ product, shelfNames, onSave, onDelete, onClose }) {
  const [name, setName] = useState(product.name);
  const [upc, setUpc] = useState(product.upc);
  const [shelf, setShelf] = useState(product.shelfName);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Editar producto</h2>

        <div className="field-group">
          <label htmlFor="edit-name">Producto</label>
          <input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field-group">
          <label htmlFor="edit-upc">UPC</label>
          <input
            id="edit-upc"
            inputMode="numeric"
            value={upc}
            onChange={(e) => setUpc(e.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="edit-shelf">Shelf</label>
          <input
            id="edit-shelf"
            list="shelf-options"
            value={shelf}
            onChange={(e) => setShelf(e.target.value)}
          />
          <datalist id="shelf-options">
            {shelfNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <BigButton
          variant="primary"
          disabled={!name.trim() || !shelf.trim()}
          onClick={() => onSave({ name, upc, shelf })}
        >
          Guardar cambios
        </BigButton>
        <BigButton variant="danger" onClick={() => onDelete(product.id)}>
          Eliminar producto
        </BigButton>
        <BigButton variant="ghost" onClick={onClose}>
          Cancelar
        </BigButton>
      </div>
    </div>
  );
}
