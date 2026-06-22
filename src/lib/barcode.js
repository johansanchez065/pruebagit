// Unified barcode scanning: prefers the native BarcodeDetector API (fast,
// zero extra download) and falls back to the ZXing WASM/JS decoder, which is
// required on iOS Safari today since it does not implement BarcodeDetector.
const RETAIL_FORMATS_NATIVE = ['upc_a', 'upc_e', 'ean_13', 'ean_8'];

export function isBarcodeDetectorSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

async function startNativeScanner({ videoElement, onDetect, onError }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
  });
  videoElement.srcObject = stream;
  await videoElement.play();

  const detector = new window.BarcodeDetector({ formats: RETAIL_FORMATS_NATIVE });
  let stopped = false;
  let rafId = null;
  let lastCheck = 0;

  const tick = async (now) => {
    if (stopped) return;
    if (now - lastCheck > 200) {
      lastCheck = now;
      try {
        const codes = await detector.detect(videoElement);
        if (codes.length > 0) onDetect(codes[0].rawValue);
      } catch (err) {
        onError?.(err);
      }
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

async function startZxingScanner({ videoElement, onDetect, onError }) {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
  ]);
  const reader = new BrowserMultiFormatReader(hints);

  const controls = await reader.decodeFromConstraints(
    { video: { facingMode: 'environment' } },
    videoElement,
    (result, error) => {
      if (result) onDetect(result.getText());
      else if (error && error.name !== 'NotFoundException') onError?.(error);
    },
  );

  return { stop: () => controls.stop() };
}

export async function startBarcodeScanner(options) {
  if (isBarcodeDetectorSupported()) {
    try {
      return await startNativeScanner(options);
    } catch (err) {
      // Permission denial or transient detector failure: fall through to
      // the ZXing path below instead of leaving the scanner dead.
    }
  }
  return startZxingScanner(options);
}
