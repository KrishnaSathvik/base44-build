export const pwaManifest = {
  name: 'Feedback Inbox', short_name: 'Feedback', description: 'Collect feedback, preserve evidence, and understand what to fix next.',
  start_url: '/', scope: '/', display: 'standalone' as const, theme_color: '#F6F5F1', background_color: '#F6F5F1',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
  ],
};
