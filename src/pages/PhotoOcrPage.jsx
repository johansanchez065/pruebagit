import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { recognizeSheetText } from '../lib/ocr';
import { parseSheetText } from '../lib/parseSheetText';
import { BigButton } from '../components/BigButton';

export function PhotoOcrPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | recognizing | done | error
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setStatus('recognizing');
    setProgress(0);
    try {
      const recognized = await recognizeSheetText(file, { onProgress: setProgress });
      setText(recognized);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const handleContinue = () => {
    const rows = parseSheetText(text);
    navigate(`/jobs/${jobId}/review`, { state: { rows } });
  };

  const retake = () => {
    setPreviewUrl(null);
    setStatus('idle');
    setText('');
    fileInputRef.current?.click();
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          ‹
        </button>
        <h1>Foto del planogram</h1>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {status === 'idle' && (
        <>
          <p className="helper-text">
            Toma una foto clara y bien iluminada de la hoja. Entre mejor se vea el texto, mejor sale la lectura
            automática.
          </p>
          <BigButton variant="primary" onClick={() => fileInputRef.current?.click()}>
            📷 Tomar foto
          </BigButton>
        </>
      )}

      {previewUrl && (
        <img src={previewUrl} alt="Foto de la hoja" style={{ width: '100%', borderRadius: 16, maxHeight: 240, objectFit: 'cover' }} />
      )}

      {status === 'recognizing' && (
        <div className="card center-text">
          <p>Leyendo texto... {Math.round(progress * 100)}%</p>
        </div>
      )}

      {status === 'error' && (
        <div className="card center-text">
          <p>No se pudo leer la imagen. Intenta con otra foto.</p>
          <BigButton variant="secondary" onClick={retake}>
            Reintentar
          </BigButton>
        </div>
      )}

      {status === 'done' && (
        <>
          <p className="helper-text">Texto detectado. Corrígelo si algo salió mal antes de continuar.</p>
          <textarea className="mono" value={text} onChange={(e) => setText(e.target.value)} />
          <BigButton variant="primary" onClick={handleContinue}>
            Continuar a revisión
          </BigButton>
          <BigButton variant="ghost" onClick={retake}>
            Tomar otra foto
          </BigButton>
        </>
      )}
    </div>
  );
}
