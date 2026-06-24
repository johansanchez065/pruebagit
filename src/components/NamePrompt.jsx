import { useState } from 'react';
import { BigButton } from './BigButton';
import { useLanguage } from '../context/LanguageContext';

export function NamePrompt({ onConfirm, onSkip }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal-sheet">
        <h2>{t('namePrompt.title')}</h2>
        <p className="helper-text">{t('namePrompt.helper')}</p>
        <div className="field-group">
          <input
            autoFocus
            placeholder={t('namePrompt.placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
          />
        </div>
        <BigButton variant="primary" disabled={!name.trim()} onClick={() => onConfirm(name.trim())}>
          {t('namePrompt.confirm')}
        </BigButton>
        <BigButton variant="ghost" onClick={onSkip}>
          {t('namePrompt.skip')}
        </BigButton>
      </div>
    </div>
  );
}
