import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaManifest } from './src/lib/pwaManifest';
import { CANONICAL_APP_ORIGIN, validateAppBaseUrl } from './base44/shared/configuration';

function metadataBaseUrl() {
  return validateAppBaseUrl(process.env.APP_BASE_URL?.trim() || CANONICAL_APP_ORIGIN, true);
}

function robotsDirective() { return (process.env.VITE_VERCEL_ENV ?? process.env.VERCEL_ENV) === 'preview' ? 'noindex, nofollow' : 'index, follow'; }

export default defineConfig({
  define: { 'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(process.env.VITE_VERCEL_ENV ?? process.env.VERCEL_ENV ?? '') },
  plugins: [{ name: 'product-metadata-urls', transformIndexHtml(html) { const base = metadataBaseUrl(); return html.replaceAll('__APP_BASE_URL__/', `${base}/`).replace('__ROBOTS__',robotsDirective()); } }, react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'og-image.png'],
    manifest: pwaManifest,
    workbox: {
      clientsClaim: true,
      navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/api\//, /^\/functions\//, /^\/auth\//],
      globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,ico}'],
      runtimeCaching: [
        { urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/') || url.pathname.startsWith('/auth/') || url.hostname.endsWith('base44.app') || url.hostname.endsWith('base44.com'), handler: 'NetworkOnly', method: 'GET' },
        { urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image', handler: 'CacheFirst', options: { cacheName: 'feedback-static-images', expiration: { maxEntries: 40, maxAgeSeconds: 2592000 }, cacheableResponse: { statuses: [200] } } },
        { urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'font', handler: 'CacheFirst', options: { cacheName: 'feedback-fonts', expiration: { maxEntries: 12, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [200] } } },
      ],
    },
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    pool: 'threads',
    maxWorkers: 1,
  },
  build: { rollupOptions: { output: { manualChunks: { 'vendor-react': ['react', 'react-dom', 'react-router-dom'], 'vendor-query': ['@tanstack/react-query'], 'vendor-base44': ['@base44/sdk'] } } } },
});
