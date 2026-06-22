import { useEffect, useRef, useState } from 'react';
import { startBarcodeScanner } from '../lib/barcode';
import { useLanguage } from '../context/LanguageContext';

export function BarcodeScannerView({ onDetect }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const lastDetectionRef = useRef({ code: null, at: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    let controls = null;
    let cancelled = false;

    const handleDetect = (rawCode) => {
      const now = Date.now();
      const last = lastDetectionRef.current;
      // The same code sits in frame for many ticks in a row; only re-fire
      // once it's been gone (or changed) for a bit so the result screen
      // doesn't flicker.
      if (rawCode === last.code && now - last.at < 1500) return;
      lastDetectionRef.current = { code: rawCode, at: now };
      onDetect(rawCode);
    };

    startBarcodeScanner({
      videoElement: videoRef.current,
      onDetect: handleDetect,
      onError: () => {},
    })
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch((err) => setError(err?.message || t('scan.cameraError')));

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onDetect, t]);

  return (
    <div className="scanner-view">
      <video ref={videoRef} muted playsInline />
      <div className="scanner-reticle" />
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  );
}
