import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Expand, ImageOff, RefreshCw, X } from 'lucide-react';
import { Button, Dialog, Skeleton } from '@/components/ui';
import {
  ATTACHMENT_ACCESS_GC_TIME_MS,
  attachmentAccessQueryKey,
  attachmentAccessStaleTime,
  invalidateAttachmentAccess,
  type AttachmentAccessFetcher,
  type AttachmentAccessScope,
} from '@/lib/attachmentAccess';
import type { AttachmentAccess } from '@/lib/types';

export interface GalleryAttachment {
  id?: string;
  accessKey?: string;
  file_name?: string;
  fileName?: string;
  width?: number | null;
  height?: number | null;
}

interface Props {
  attachments: GalleryAttachment[];
  scopeFor: (attachment: GalleryAttachment) => AttachmentAccessScope;
  fetchAccess: AttachmentAccessFetcher;
}

function useElementVisible<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: '100px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function AttachmentTile({
  item,
  scope,
  fetchAccess,
  onOpen,
}: {
  item: GalleryAttachment;
  scope: AttachmentAccessScope;
  fetchAccess: AttachmentAccessFetcher;
  onOpen: () => void;
}) {
  const queryClient = useQueryClient();
  const { ref, visible } = useElementVisible<HTMLDivElement>();
  const autoRefreshUsed = useRef(false);
  const [failed, setFailed] = useState(false);
  const name = item.file_name ?? item.fileName ?? 'Screenshot';

  const query = useQuery<AttachmentAccess>({
    queryKey: attachmentAccessQueryKey(scope),
    queryFn: () => fetchAccess(scope),
    enabled: visible && !failed,
    staleTime: (q) => attachmentAccessStaleTime(q.state.data),
    gcTime: ATTACHMENT_ACCESS_GC_TIME_MS,
    retry: false,
  });

  const signedUrl = query.data?.signedUrl;

  const refresh = useCallback(
    async (manual: boolean) => {
      if (!manual && autoRefreshUsed.current) {
        setFailed(true);
        return;
      }
      if (!manual) autoRefreshUsed.current = true;
      setFailed(false);
      await invalidateAttachmentAccess(queryClient, scope);
      try {
        await queryClient.fetchQuery({
          queryKey: attachmentAccessQueryKey(scope),
          queryFn: () => fetchAccess(scope),
          staleTime: (q) => attachmentAccessStaleTime(q.state.data as AttachmentAccess | undefined),
          gcTime: ATTACHMENT_ACCESS_GC_TIME_MS,
        });
      } catch {
        setFailed(true);
      }
    },
    [fetchAccess, queryClient, scope],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div ref={ref} className="relative aspect-video bg-surface-subtle">
        {failed || query.isError ? (
          <div className="flex h-full flex-col items-center justify-center">
            <ImageOff className="h-5 w-5 text-ink-faint" />
            <p className="mt-2 text-xs text-ink-muted">Attachment unavailable</p>
            <Button
              type="button"
              variant="ghost"
              className="mt-1 min-h-8 text-xs"
              onClick={() => {
                autoRefreshUsed.current = false;
                void refresh(true);
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh access
            </Button>
          </div>
        ) : signedUrl ? (
          <>
            <img
              src={signedUrl}
              alt={name}
              className="h-full w-full object-cover"
              onError={() => void refresh(false)}
            />
            <button
              type="button"
              aria-label={`Open ${name}`}
              onClick={onOpen}
              className="absolute inset-0 flex items-end justify-end bg-transparent p-2 opacity-0 transition hover:bg-ink/10 hover:opacity-100 focus:opacity-100"
            >
              <span className="rounded bg-ink/75 p-2 text-white">
                <Expand className="h-4 w-4" />
              </span>
            </button>
          </>
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>
      <p className="truncate px-3 py-2 text-xs text-ink-muted">{name}</p>
    </div>
  );
}

export function AttachmentGallery({ attachments, scopeFor, fetchAccess }: Props) {
  const [active, setActive] = useState<GalleryAttachment | null>(null);
  const activeScope = active ? scopeFor(active) : null;
  const activeQuery = useQuery<AttachmentAccess>({
    queryKey: activeScope ? attachmentAccessQueryKey(activeScope) : ['attachment-access', 'idle'],
    queryFn: () => fetchAccess(activeScope!),
    enabled: !!activeScope,
    staleTime: (q) => attachmentAccessStaleTime(q.state.data),
    gcTime: ATTACHMENT_ACCESS_GC_TIME_MS,
    retry: false,
  });

  if (!attachments.length) {
    return (
      <div className="rounded-lg border border-dashed border-line p-6 text-center">
        <ImageOff className="mx-auto h-5 w-5 text-ink-faint" />
        <p className="mt-2 text-sm">No screenshots submitted</p>
        <p className="mt-1 text-xs text-ink-faint">The report contains text evidence only.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {attachments.map((item) => {
          const scope = scopeFor(item);
          const key =
            scope.kind === 'owner'
              ? scope.attachmentId
              : `${scope.token}:${scope.attachmentKey}`;
          return (
            <AttachmentTile
              key={key}
              item={item}
              scope={scope}
              fetchAccess={fetchAccess}
              onOpen={() => setActive(item)}
            />
          );
        })}
      </div>
      <Dialog
        open={!!active}
        title={active?.file_name ?? active?.fileName ?? 'Screenshot'}
        onClose={() => setActive(null)}
      >
        {active && activeQuery.data?.signedUrl ? (
          <div className="relative">
            <img
              src={activeQuery.data.signedUrl}
              alt={active.file_name ?? active.fileName ?? 'Screenshot'}
              className="max-h-[75vh] w-full object-contain"
            />
            <button className="sr-only" onClick={() => setActive(null)}>
              <X />
              Close
            </button>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
