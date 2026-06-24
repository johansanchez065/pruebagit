// Unified barcode scanning: prefers the native BarcodeDetector API (fast,
// zero extra download) and falls back to the ZXing WASM/JS decoder, which is
// required on iOS Safari today since it does not implement BarcodeDetector.
// `mode` keeps the two use cases separate: scanning a product's UPC/EAN on
// the shelf vs. scanning a teammate's job-sharing QR code.
const NATIVE_FORMATS = {
  retail: ['upc_a', 'upc_e', 'ean_13', 'ean_8'],
  qr: ['qr_code'],
};

const ZXING_FORMAT_NAMES = {
  retail: ['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8'],
  qr: ['QR_CODE'],
};

export function isBarcodeDetectorSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

async function startNativeScanner({ videoElement, onDetect, onError, mode }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
  });
  videoElement.srcObject = stream;
  await videoElement.play();

  const detector = new window.BarcodeDetector({ formats: NATIVE_FORMATS[mode] });
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

async function startZxingScanner({ videoElement, onDetect, onError, mode }) {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);

  const hints = new Map();
  hints.set(
    DecodeHintType.POSSIBLE_FORMATS,
    ZXING_FORMAT_NAMES[mode].map((name) => BarcodeFormat[name]),
  );
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
  const mode = options.mode || 'retail';
  if (isBarcodeDetectorSupported()) {
    try {
      return await startNativeScanner({ ...options, mode });
    } catch (err) {
      // Permission denial or transient detector failure: fall through to
      // the ZXing path below instead of leaving the scanner dead.
    }
  }
  return startZxingScanner({ ...options, mode });
}
