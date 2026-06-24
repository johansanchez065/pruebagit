import { useLanguage } from '../context/LanguageContext';

export function SearchBar({ value, onChange, onScanClick, placeholder }) {
  const { t } = useLanguage();
  return (
    <div className="search-bar">
      <input
        type="text"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('searchBar.placeholder')}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {value ? (
        <button type="button" className="icon-btn" aria-label={t('searchBar.clearLabel')} onClick={() => onChange('')}>
          ✕
        </button>
      ) : null}
      <button type="button" className="icon-btn" aria-label={t('searchBar.scanLabel')} onClick={onScanClick}>
        📷
      </button>
    </div>
  );
}
