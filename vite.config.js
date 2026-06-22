import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages serves this project from /pruebagit/, not from the domain
  // root, so every built asset reference needs that prefix.
  base: '/pruebagit/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Shelf Finder',
        short_name: 'Shelf Finder',
        description: 'Encuentra rápido dónde va cada producto durante sets y resets de tienda.',
        theme_color: '#1d4ed8',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/pruebagit/',
        scope: '/pruebagit/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tesseract.js fetches its worker/core/wasm and language data from a CDN
        // on first use; cache them so OCR keeps working without a fresh download
        // every time a job is created in-store.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-cdn',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
});
