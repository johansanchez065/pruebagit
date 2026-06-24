// Generates placeholder PNG icons for the PWA manifest without any image-library
// dependency, by writing raw PNG chunks (IHDR/IDAT/IEND) directly.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function buildPng(size, paint) {
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const BG = [29, 78, 216, 255]; // blue-700
const BAR = [255, 255, 255, 255];
const ACCENT = [251, 146, 60, 255]; // orange-400

// Three "shelf" bars of decreasing width plus an accent dot, centered, with a
// safe margin so the design survives maskable/circular cropping on Android/iOS.
function paintShelfIcon(x, y, size) {
  const margin = size * 0.18;
  const innerW = size - margin * 2;
  const barHeight = innerW * 0.12;
  const gap = innerW * 0.14;
  const widths = [1, 0.78, 0.56];
  const totalH = barHeight * 3 + gap * 2;
  const top = (size - totalH) / 2;

  for (let i = 0; i < 3; i++) {
    const barTop = top + i * (barHeight + gap);
    const barBottom = barTop + barHeight;
    const barW = innerW * widths[i];
    const barLeft = (size - barW) / 2;
    const barRight = barLeft + barW;
    if (y >= barTop && y < barBottom && x >= barLeft && x < barRight) {
      return BAR;
    }
  }

  const dotR = size * 0.06;
  const cx = size - margin - dotR * 1.4;
  const cy = margin + dotR * 1.4;
  if ((x - cx) ** 2 + (y - cy) ** 2 <= dotR ** 2) {
    return ACCENT;
  }

  return BG;
}

mkdirSync('public/icons', { recursive: true });

const targets = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/maskable-512.png', 512],
  ['public/apple-touch-icon.png', 180],
];

for (const [path, size] of targets) {
  writeFileSync(path, buildPng(size, paintShelfIcon));
  console.log('wrote', path);
}
