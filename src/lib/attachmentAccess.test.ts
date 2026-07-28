import { QueryClient } from '@tanstack/react-query';
import { afterEach, expect, test, vi } from 'vitest';
import {
  ATTACHMENT_ACCESS_STALE_MARGIN_MS,
  attachmentAccessQueryKey,
  attachmentAccessRemainingFreshMs,
  fetchCachedAttachmentAccess,
  invalidateAttachmentAccess,
  isAttachmentAccessStale,
  type AttachmentAccessScope,
} from '@/lib/attachmentAccess';
import type { AttachmentAccess } from '@/lib/types';

const farExpiry = () => new Date(Date.now() + 40 * 60_000).toISOString();
const nearExpiry = () => new Date(Date.now() + ATTACHMENT_ACCESS_STALE_MARGIN_MS / 2).toISOString();
const pastExpiry = () => new Date(Date.now() - 1_000).toISOString();

afterEach(() => {
  vi.useRealTimers();
});

test('owner and reporter access caches cannot share authorization scopes', () => {
  const owner: AttachmentAccessScope = { kind: 'owner', attachmentId: 'att-1' };
  const reporter: AttachmentAccessScope = { kind: 'reporter', token: 'tok', attachmentKey: 'att-1' };
  expect(attachmentAccessQueryKey(owner)).not.toEqual(attachmentAccessQueryKey(reporter));
  expect(attachmentAccessQueryKey(owner)).toEqual(['attachment-access', 'owner', 'att-1']);
  expect(attachmentAccessQueryKey(reporter)).toEqual(['attachment-access', 'reporter', 'tok', 'att-1']);
});

test('near-expiry access is treated as stale and expired access is refreshed', () => {
  expect(isAttachmentAccessStale(farExpiry())).toBe(false);
  expect(isAttachmentAccessStale(nearExpiry())).toBe(true);
  expect(isAttachmentAccessStale(pastExpiry())).toBe(true);
  expect(attachmentAccessRemainingFreshMs(farExpiry())).toBeGreaterThan(0);
  expect(attachmentAccessRemainingFreshMs(nearExpiry())).toBe(0);
});

test('one attachment produces one access request while its cached URL remains valid', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const scope: AttachmentAccessScope = { kind: 'owner', attachmentId: 'a1' };
  const access: AttachmentAccess = { signedUrl: 'https://signed.example/a1', expiresAt: farExpiry() };
  const fetchAccess = vi.fn().mockResolvedValue(access);

  const first = await fetchCachedAttachmentAccess(client, scope, fetchAccess);
  const second = await fetchCachedAttachmentAccess(client, scope, fetchAccess);

  expect(first).toEqual(access);
  expect(second).toEqual(access);
  expect(fetchAccess).toHaveBeenCalledTimes(1);
});

test('concurrent consumers deduplicate the request', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const scope: AttachmentAccessScope = { kind: 'owner', attachmentId: 'a1' };
  let resolve!: (value: AttachmentAccess) => void;
  const fetchAccess = vi.fn().mockImplementation(
    () =>
      new Promise<AttachmentAccess>((r) => {
        resolve = r;
      }),
  );

  const p1 = fetchCachedAttachmentAccess(client, scope, fetchAccess);
  const p2 = fetchCachedAttachmentAccess(client, scope, fetchAccess);
  resolve({ signedUrl: 'https://signed.example/shared', expiresAt: farExpiry() });
  const [a, b] = await Promise.all([p1, p2]);

  expect(a.signedUrl).toBe(b.signedUrl);
  expect(fetchAccess).toHaveBeenCalledTimes(1);
});

test('expired access is refreshed on the next request', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const scope: AttachmentAccessScope = { kind: 'owner', attachmentId: 'a1' };
  const fetchAccess = vi
    .fn()
    .mockResolvedValueOnce({ signedUrl: 'https://signed.example/old', expiresAt: pastExpiry() })
    .mockResolvedValueOnce({ signedUrl: 'https://signed.example/new', expiresAt: farExpiry() });

  const first = await fetchCachedAttachmentAccess(client, scope, fetchAccess);
  const second = await fetchCachedAttachmentAccess(client, scope, fetchAccess);

  expect(first.signedUrl).toBe('https://signed.example/old');
  expect(second.signedUrl).toBe('https://signed.example/new');
  expect(fetchAccess).toHaveBeenCalledTimes(2);
});

test('manual refresh invalidates only that attachment', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const a1: AttachmentAccessScope = { kind: 'owner', attachmentId: 'a1' };
  const a2: AttachmentAccessScope = { kind: 'owner', attachmentId: 'a2' };
  const fetchAccess = vi.fn(async (scope: AttachmentAccessScope) => ({
    signedUrl: `https://signed.example/${scope.kind === 'owner' ? scope.attachmentId : scope.attachmentKey}`,
    expiresAt: farExpiry(),
  }));

  await fetchCachedAttachmentAccess(client, a1, fetchAccess);
  await fetchCachedAttachmentAccess(client, a2, fetchAccess);
  await invalidateAttachmentAccess(client, a1);
  await fetchCachedAttachmentAccess(client, a1, fetchAccess);
  await fetchCachedAttachmentAccess(client, a2, fetchAccess);

  expect(fetchAccess).toHaveBeenCalledTimes(3);
  expect(fetchAccess.mock.calls.filter(([scope]) => scope.kind === 'owner' && scope.attachmentId === 'a1')).toHaveLength(2);
  expect(fetchAccess.mock.calls.filter(([scope]) => scope.kind === 'owner' && scope.attachmentId === 'a2')).toHaveLength(1);
});
