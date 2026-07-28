import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { queryClient } from '@/lib/queryClient';

test('signed URLs are absent from persistent storage and offline caches', () => {
  const attachmentAccess = readFileSync('src/lib/attachmentAccess.ts', 'utf8');
  const gallery = readFileSync('src/components/AttachmentGallery.tsx', 'utf8');
  const main = readFileSync('src/main.tsx', 'utf8');
  const vite = readFileSync('vite.config.ts', 'utf8');
  const query = readFileSync('src/lib/queryClient.ts', 'utf8');

  expect(attachmentAccess).not.toMatch(/localDatabase|localStorage|sessionStorage|indexedDB|persistQueryClient/);
  expect(gallery).not.toMatch(/localDatabase|localStorage|sessionStorage|indexedDB|persistQueryClient/);
  expect(main).not.toMatch(/PersistQueryClientProvider|persistQueryClient|createSyncStoragePersister/);
  expect(query).not.toMatch(/persist|localStorage|indexedDB/);
  expect(queryClient.getDefaultOptions().queries?.gcTime === undefined || typeof queryClient.getDefaultOptions().queries?.gcTime === 'number').toBe(true);

  // Workbox may CacheFirst same-origin static images only; Base44 hosts stay NetworkOnly.
  expect(vite).toMatch(/sameOrigin && request\.destination === 'image'/);
  expect(vite).toMatch(/base44\.app/);
  expect(vite).toMatch(/NetworkOnly/);
  expect(vite).not.toMatch(/signedUrl|signed_url|CreateFileSignedUrl/);
});
