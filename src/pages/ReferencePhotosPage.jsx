import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listPhotos, addPhoto, deletePhoto } from '../db/photosRepo';
import { BigButton } from '../components/BigButton';
import { EmptyState } from '../components/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export function ReferencePhotosPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const showToast = useToast();
  const fileInputRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [urls, setUrls] = useState(new Map());
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    const list = await listPhotos(jobId);
    setPhotos(list);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Photos are stored as Blobs, not URLs — object URLs are created/cleaned up
  // here whenever the photo list changes, never left dangling.
  useEffect(() => {
    const next = new Map();
    for (const photo of photos) next.set(photo.id, URL.createObjectURL(photo.blob));
    setUrls(next);
    return () => {
      next.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await addPhoto(jobId, file);
      await refresh();
    } catch {
      showToast(t('common.saveError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePhoto(id);
      await refresh();
    } catch {
      showToast(t('common.saveError'));
    }
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ‹
        </button>
        <h1>{t('photos.title')}</h1>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <BigButton variant="primary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
        {uploading ? t('photos.uploading') : t('photos.addPhoto')}
      </BigButton>

      {photos.length === 0 ? (
        <EmptyState emoji="🖼️" title={t('photos.emptyTitle')} subtitle={t('photos.emptySubtitle')} />
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <div className="photo-thumb" key={photo.id}>
              <img src={urls.get(photo.id)} alt={t('photos.imageAlt')} />
              <button
                type="button"
                className="icon-btn icon-btn--danger photo-thumb-delete"
                aria-label={t('photos.deleteLabel')}
                onClick={() => handleDelete(photo.id)}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
