import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AttachmentGallery } from '@/components/AttachmentGallery';
import type { AttachmentAccessScope } from '@/lib/attachmentAccess';
import { ATTACHMENT_ACCESS_STALE_MARGIN_MS } from '@/lib/attachmentAccess';

const farExpiry = () => new Date(Date.now() + 40 * 60_000).toISOString();

type ObserveMode = 'visible' | 'hidden';

let observeMode: ObserveMode = 'visible';

beforeEach(() => {
  observeMode = 'visible';
  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: observeMode === 'visible', target, intersectionRatio: observeMode === 'visible' ? 1 : 0 } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function renderGallery(
  client: QueryClient,
  props: {
    attachments: Array<{ id?: string; accessKey?: string; file_name?: string }>;
    fetchAccess: (scope: AttachmentAccessScope) => Promise<{ signedUrl: string; expiresAt: string }>;
    scopeKind?: 'owner' | 'reporter';
  },
) {
  const scopeKind = props.scopeKind ?? 'owner';
  return render(
    <AttachmentGallery
      attachments={props.attachments}
      scopeFor={(item) =>
        scopeKind === 'owner'
          ? { kind: 'owner', attachmentId: item.id ?? '' }
          : { kind: 'reporter', token: 'tok', attachmentKey: item.accessKey ?? item.id ?? '' }
      }
      fetchAccess={props.fetchAccess}
    />,
    { wrapper: wrapper(client) },
  );
}

test('shows an intentional no-screenshot evidence state', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  renderGallery(client, { attachments: [], fetchAccess: vi.fn() });
  expect(screen.getByText('No screenshots submitted')).toBeVisible();
});

test('remounting the gallery reuses the React Query cache', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const fetchAccess = vi.fn().mockResolvedValue({
    signedUrl: 'https://signed.invalid/cached',
    expiresAt: farExpiry(),
  });

  const first = renderGallery(client, {
    attachments: [{ id: 'a1', file_name: 'shot.png' }],
    fetchAccess,
  });
  expect(await screen.findByAltText('shot.png')).toHaveAttribute('src', 'https://signed.invalid/cached');
  expect(fetchAccess).toHaveBeenCalledTimes(1);
  first.unmount();

  renderGallery(client, {
    attachments: [{ id: 'a1', file_name: 'shot.png' }],
    fetchAccess,
  });
  expect(await screen.findByAltText('shot.png')).toHaveAttribute('src', 'https://signed.invalid/cached');
  expect(fetchAccess).toHaveBeenCalledTimes(1);
});

test('thumbnail and dialog reuse the same URL', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const fetchAccess = vi.fn().mockResolvedValue({
    signedUrl: 'https://signed.invalid/shared',
    expiresAt: farExpiry(),
  });
  renderGallery(client, {
    attachments: [{ id: 'a1', file_name: 'shot.png' }],
    fetchAccess,
  });
  const thumb = await screen.findByAltText('shot.png');
  fireEvent.click(screen.getByRole('button', { name: 'Open shot.png' }));
  const images = await screen.findAllByAltText('shot.png');
  expect(images.length).toBeGreaterThanOrEqual(2);
  expect(images.every((img) => img.getAttribute('src') === 'https://signed.invalid/shared')).toBe(true);
  expect(thumb).toHaveAttribute('src', 'https://signed.invalid/shared');
  expect(fetchAccess).toHaveBeenCalledTimes(1);
});

test('hidden galleries make no request', async () => {
  observeMode = 'hidden';
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const fetchAccess = vi.fn().mockResolvedValue({
    signedUrl: 'https://signed.invalid/hidden',
    expiresAt: farExpiry(),
  });
  renderGallery(client, {
    attachments: [{ id: 'a1', file_name: 'shot.png' }],
    fetchAccess,
  });
  await waitFor(() => expect(screen.getByText('shot.png')).toBeVisible());
  expect(fetchAccess).not.toHaveBeenCalled();
  expect(screen.queryByAltText('shot.png')).toBeNull();
});

test('one image error cannot create an infinite signed-URL loop', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const fetchAccess = vi
    .fn()
    .mockResolvedValueOnce({ signedUrl: 'https://signed.invalid/first', expiresAt: farExpiry() })
    .mockResolvedValueOnce({ signedUrl: 'https://signed.invalid/refreshed', expiresAt: farExpiry() })
    .mockResolvedValue({ signedUrl: 'https://signed.invalid/again', expiresAt: farExpiry() });

  renderGallery(client, {
    attachments: [{ id: 'a1', file_name: 'shot.png' }],
    fetchAccess,
  });
  const image = await screen.findByAltText('shot.png');
  fireEvent.error(image);
  await waitFor(() => expect(fetchAccess).toHaveBeenCalledTimes(2));
  const refreshed = await screen.findByAltText('shot.png');
  fireEvent.error(refreshed);
  fireEvent.error(refreshed);
  await waitFor(() => expect(screen.getByText('Attachment unavailable')).toBeVisible());
  expect(fetchAccess).toHaveBeenCalledTimes(2);
});

test('manual refresh invalidates only that attachment from the gallery', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const fetchAccess = vi.fn(async (scope: AttachmentAccessScope) => ({
    signedUrl: `https://signed.invalid/${scope.kind === 'owner' ? scope.attachmentId : 'x'}`,
    expiresAt: farExpiry(),
  }));

  renderGallery(client, {
    attachments: [
      { id: 'a1', file_name: 'one.png' },
      { id: 'a2', file_name: 'two.png' },
    ],
    fetchAccess,
  });
  await screen.findByAltText('one.png');
  await screen.findByAltText('two.png');
  expect(fetchAccess).toHaveBeenCalledTimes(2);

  fireEvent.error(screen.getByAltText('one.png'));
  await waitFor(() => expect(fetchAccess).toHaveBeenCalledTimes(3));
  const refreshed = await screen.findByAltText('one.png');
  fireEvent.error(refreshed);
  await waitFor(() => expect(screen.getByText('Attachment unavailable')).toBeVisible());
  expect(fetchAccess).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByRole('button', { name: /Refresh access/i }));
  await waitFor(() => expect(fetchAccess).toHaveBeenCalledTimes(4));
  expect(fetchAccess.mock.calls.filter(([scope]) => scope.kind === 'owner' && scope.attachmentId === 'a2')).toHaveLength(1);
});

test('refreshes temporary access when an image link expires', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const getAccess = vi
    .fn()
    .mockResolvedValueOnce({ signedUrl: 'https://signed.invalid/first', expiresAt: farExpiry() })
    .mockResolvedValueOnce({
      signedUrl: 'https://signed.invalid/refreshed',
      expiresAt: new Date(Date.now() + 40 * 60_000).toISOString(),
    });
  renderGallery(client, {
    attachments: [{ id: 'a1', file_name: 'shot.png' }],
    fetchAccess: getAccess,
  });
  const image = await screen.findByAltText('shot.png');
  fireEvent.error(image);
  await waitFor(() => expect(getAccess).toHaveBeenCalledTimes(2));
});

test('near-expiry cached access is treated as stale by the gallery', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const near = new Date(Date.now() + ATTACHMENT_ACCESS_STALE_MARGIN_MS / 2).toISOString();
  const fetchAccess = vi
    .fn()
    .mockResolvedValueOnce({ signedUrl: 'https://signed.invalid/near', expiresAt: near })
    .mockResolvedValueOnce({ signedUrl: 'https://signed.invalid/fresh', expiresAt: farExpiry() });

  const first = renderGallery(client, {
    attachments: [{ id: 'a1', file_name: 'shot.png' }],
    fetchAccess,
  });
  expect(await screen.findByAltText('shot.png')).toHaveAttribute('src', 'https://signed.invalid/near');
  first.unmount();

  renderGallery(client, {
    attachments: [{ id: 'a1', file_name: 'shot.png' }],
    fetchAccess,
  });
  await waitFor(() => expect(fetchAccess).toHaveBeenCalledTimes(2));
  expect(await screen.findByAltText('shot.png')).toHaveAttribute('src', 'https://signed.invalid/fresh');
});
