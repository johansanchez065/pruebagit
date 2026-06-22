import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { parseSheetText } from '../lib/parseSheetText';
import { BigButton } from '../components/BigButton';

const EXAMPLE = `Shelf 3:\nPañitos húmedos 483823747292\nPañitos secos 2027373022038\nPañales 382721939404\n\nShelf 4:\nToallas 03834747`;

export function PasteTextPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [text, setText] = useState('');

  const handleProcess = () => {
    const rows = parseSheetText(text);
    navigate(`/jobs/${jobId}/review`, { state: { rows } });
  };

  return (
    <div className="screen">
      <div className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          ‹
        </button>
        <h1>Pegar texto</h1>
      </div>

      <p className="helper-text">
        Pega el texto de la hoja. Usa líneas tipo "Shelf 3:" para marcar el shelf y luego una línea por producto
        terminando en el UPC.
      </p>

      <textarea
        className="mono"
        placeholder={EXAMPLE}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />

      <BigButton variant="primary" disabled={!text.trim()} onClick={handleProcess}>
        Procesar texto
      </BigButton>
    </div>
  );
}
