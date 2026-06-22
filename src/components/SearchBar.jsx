export function SearchBar({ value, onChange, onScanClick, placeholder }) {
  return (
    <div className="search-bar">
      <input
        type="text"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Buscar por UPC o nombre...'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {value ? (
        <button type="button" className="icon-btn" aria-label="Limpiar" onClick={() => onChange('')}>
          ✕
        </button>
      ) : null}
      <button type="button" className="icon-btn" aria-label="Escanear código de barras" onClick={onScanClick}>
        📷
      </button>
    </div>
  );
}
