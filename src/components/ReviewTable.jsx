export function ReviewTable({ rows, onChangeRow, onDeleteRow, onAddRow, shelfNames }) {
  return (
    <div className="shelf-group">
      <datalist id="review-shelf-options">
        {shelfNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {rows.map((row) => (
        <div className="review-row" key={row.rowId}>
          <div className="review-row-grid">
            <input
              list="review-shelf-options"
              placeholder="Shelf"
              value={row.shelf}
              onChange={(e) => onChangeRow(row.rowId, { shelf: e.target.value })}
            />
            <input
              inputMode="numeric"
              placeholder="UPC"
              value={row.upc}
              onChange={(e) => onChangeRow(row.rowId, { upc: e.target.value })}
            />
          </div>
          <input
            placeholder="Nombre del producto"
            value={row.name}
            onChange={(e) => onChangeRow(row.rowId, { name: e.target.value })}
          />
          <div className="review-row-actions">
            <button type="button" className="icon-btn icon-btn--danger" aria-label="Eliminar fila" onClick={() => onDeleteRow(row.rowId)}>
              🗑
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="big-btn big-btn--secondary" onClick={onAddRow}>
        + Agregar fila
      </button>
    </div>
  );
}
