export function IconButton({ variant, label, onClick, children }) {
  return (
    <button
      type="button"
      className={`icon-btn ${variant ? `icon-btn--${variant}` : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
