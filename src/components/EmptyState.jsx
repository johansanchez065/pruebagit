export function EmptyState({ emoji = '📦', title, subtitle, children }) {
  return (
    <div className="empty-state">
      <div className="empty-state-emoji">{emoji}</div>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {subtitle && <p className="helper-text">{subtitle}</p>}
      {children}
    </div>
  );
}
