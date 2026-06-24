import { useLanguage } from '../context/LanguageContext';

export function LanguagePicker() {
  const { setLang } = useLanguage();

  return (
    <div className="screen" style={{ justifyContent: 'center', textAlign: 'center', gap: 24 }}>
      <div>
        <div style={{ fontSize: 48 }}>🌐</div>
        <h1 style={{ margin: '12px 0 4px' }}>Choose your language / Elige tu idioma</h1>
        <p className="helper-text">You can change it later from the home screen. · Podrás cambiarlo después.</p>
      </div>

      <button type="button" className="big-btn big-btn--primary" onClick={() => setLang('es')}>
        🇪🇸 Español
      </button>
      <button type="button" className="big-btn big-btn--secondary" onClick={() => setLang('en')}>
        🇬🇧 English
      </button>
    </div>
  );
}
