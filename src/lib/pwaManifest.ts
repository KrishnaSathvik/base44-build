export const pwaManifest = {
  name: 'VensaOS', short_name: 'VensaOS', description: 'Feedback intelligence for product teams.',
  start_url: '/', scope: '/', display: 'standalone' as const, theme_color: '#F6F5F1', background_color: '#F6F5F1',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
  ],
};
