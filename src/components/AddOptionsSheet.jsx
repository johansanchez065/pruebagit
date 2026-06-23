import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findOrCreateShelf } from '../db/shelvesRepo';
import { BigButton } from './BigButton';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export function AddOptionsSheet({ jobId, onClose, onShelfCreated }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const showToast = useToast();
  const [creatingShelf, setCreatingShelf] = useState(false);
  const [shelfName, setShelfName] = useState('');
  const [savingShelf, setSavingShelf] = useState(false);

  const handleCreateShelf = async () => {
    if (!shelfName.trim() || savingShelf) return;
    setSavingShelf(true);
    try {
      await findOrCreateShelf(jobId, shelfName);
      onShelfCreated?.();
      onClose();
    } catch {
      showToast(t('common.saveError'));
      setSavingShelf(false);
    }
  };

  if (creatingShelf) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <h2>{t('addOptions.newShelfTitle')}</h2>
          <div className="field-group">
            <label htmlFor="new-shelf-name">{t('addOptions.shelfNameLabel')}</label>
            <input
              id="new-shelf-name"
              autoFocus
              placeholder={t('addOptions.shelfNamePlaceholder')}
              value={shelfName}
              onChange={(e) => setShelfName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateShelf()}
            />
          </div>
          <BigButton variant="primary" disabled={!shelfName.trim() || savingShelf} onClick={handleCreateShelf}>
            {t('addOptions.createShelf')}
          </BigButton>
          <BigButton variant="ghost" onClick={() => setCreatingShelf(false)}>
            {t('addOptions.back')}
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{t('addOptions.title')}</h2>
        <BigButton variant="primary" onClick={() => navigate(`/jobs/${jobId}/add/photo`)}>
          {t('addOptions.takePhoto')}
        </BigButton>
        <BigButton variant="secondary" onClick={() => navigate(`/jobs/${jobId}/add/paste`)}>
          {t('addOptions.pasteText')}
        </BigButton>
        <BigButton variant="secondary" onClick={() => navigate(`/jobs/${jobId}/add/manual`)}>
          {t('addOptions.addManual')}
        </BigButton>
        <BigButton variant="secondary" onClick={() => setCreatingShelf(true)}>
          {t('addOptions.createEmptyShelf')}
        </BigButton>
        <BigButton variant="ghost" onClick={onClose}>
          {t('addOptions.cancel')}
        </BigButton>
      </div>
    </div>
  );
}
