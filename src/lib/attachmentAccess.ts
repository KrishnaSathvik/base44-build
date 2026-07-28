import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  ATTACHMENT_ACCESS_STALE_MARGIN_MS,
  SIGNED_URL_TTL_SECONDS,
  attachmentAccessRemainingFreshMs,
  isAttachmentAccessStale,
} from '../../base44/shared/attachment-security';
import type { AttachmentAccess } from '@/lib/types';

export {
  ATTACHMENT_ACCESS_STALE_MARGIN_MS,
  SIGNED_URL_TTL_SECONDS,
  attachmentAccessRemainingFreshMs,
  isAttachmentAccessStale,
};

export type AttachmentAccessScope =
  | { kind: 'owner'; attachmentId: string }
  | { kind: 'reporter'; token: string; attachmentKey: string };

export type AttachmentAccessFetcher = (scope: AttachmentAccessScope) => Promise<AttachmentAccess>;

export function attachmentAccessQueryKey(scope: AttachmentAccessScope): QueryKey {
  switch (scope.kind) {
    case 'owner':
      return ['attachment-access', 'owner', scope.attachmentId];
    case 'reporter':
      return ['attachment-access', 'reporter', scope.token, scope.attachmentKey];
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

export function attachmentAccessStaleTime(access: AttachmentAccess | undefined, now = Date.now()): number {
  if (!access?.expiresAt) return 0;
  return attachmentAccessRemainingFreshMs(access.expiresAt, now);
}

/** Keep cached entries until the signed URL itself expires (memory only — never persisted). */
export const ATTACHMENT_ACCESS_GC_TIME_MS = SIGNED_URL_TTL_SECONDS * 1000;

export async function fetchCachedAttachmentAccess(
  queryClient: QueryClient,
  scope: AttachmentAccessScope,
  fetchAccess: AttachmentAccessFetcher,
): Promise<AttachmentAccess> {
  return queryClient.fetchQuery({
    queryKey: attachmentAccessQueryKey(scope),
    queryFn: () => fetchAccess(scope),
    staleTime: (query) => attachmentAccessStaleTime(query.state.data as AttachmentAccess | undefined),
    gcTime: ATTACHMENT_ACCESS_GC_TIME_MS,
  });
}

export async function invalidateAttachmentAccess(
  queryClient: QueryClient,
  scope: AttachmentAccessScope,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: attachmentAccessQueryKey(scope) });
}
