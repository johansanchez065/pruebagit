import { useState } from 'react';
import { BigButton } from './BigButton';
import { useLanguage } from '../context/LanguageContext';

export function ProductEditModal({ product, shelfNames, onSave, onDelete, onClose }) {
  const { t } = useLanguage();
  const [description, setDescription] = useState(product.description);
  const [upc, setUpc] = useState(product.upc);
  const [shelf, setShelf] = useState(product.shelfName);
  const [position, setPosition] = useState(product.position || '');
  const [stockcode, setStockcode] = useState(product.stockcode || '');
  const [size, setSize] = useState(product.size || '');
  const [uom, setUom] = useState(product.uom || '');
  const [facings, setFacings] = useState(product.facings || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{t('productEdit.title')}</h2>

        <div className="field-group">
          <label htmlFor="edit-description">{t('productEdit.productLabel')}</label>
          <input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="review-row-grid">
          <div className="field-group">
            <label htmlFor="edit-shelf">{t('productEdit.shelfLabel')}</label>
            <input id="edit-shelf" list="shelf-options" value={shelf} onChange={(e) => setShelf(e.target.value)} />
            <datalist id="shelf-options">
              {shelfNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div className="field-group">
            <label htmlFor="edit-position">{t('productEdit.positionLabel')}</label>
            <input id="edit-position" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
        </div>

        <div className="review-row-grid">
          <div className="field-group">
            <label htmlFor="edit-upc">{t('productEdit.upcLabel')}</label>
            <input id="edit-upc" inputMode="numeric" value={upc} onChange={(e) => setUpc(e.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="edit-stockcode">{t('productEdit.stockcodeLabel')}</label>
            <input id="edit-stockcode" value={stockcode} onChange={(e) => setStockcode(e.target.value)} />
          </div>
        </div>

        <div className="review-row-3col">
          <div className="field-group">
            <label htmlFor="edit-size">{t('productEdit.sizeLabel')}</label>
            <input id="edit-size" value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="edit-uom">{t('productEdit.uomLabel')}</label>
            <input id="edit-uom" value={uom} onChange={(e) => setUom(e.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="edit-facings">{t('productEdit.facingsLabel')}</label>
            <input id="edit-facings" inputMode="numeric" value={facings} onChange={(e) => setFacings(e.target.value)} />
          </div>
        </div>

        <BigButton
          variant="primary"
          disabled={!description.trim() || !shelf.trim()}
          onClick={() => onSave({ description, upc, shelf, position, stockcode, size, uom, facings })}
        >
          {t('productEdit.save')}
        </BigButton>
        <BigButton variant="danger" onClick={() => onDelete(product.id)}>
          {t('productEdit.delete')}
        </BigButton>
        <BigButton variant="ghost" onClick={onClose}>
          {t('productEdit.cancel')}
        </BigButton>
      </div>
    </div>
  );
}
