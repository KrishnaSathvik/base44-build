import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listMyNotificationDeliveries } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { IconButton, cn } from '@/components/ui';
import type { NotificationDelivery } from '@/lib/types';

function templateLabel(key: NotificationDelivery['template_key']): string {
  switch (key) {
    case 'owner_critical_issue':
      return 'Critical issue alert';
    case 'owner_reporter_reply':
      return 'Reporter reply';
    case 'reporter_information_requested':
      return 'Information requested';
    case 'reporter_status_update':
      return 'Status update';
    case 'reporter_issue_resolved':
      return 'Issue resolved';
    case 'reporter_issue_reopened':
      return 'Issue reopened';
    case 'owner_daily_digest':
      return 'Daily digest';
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function statusTone(status: NotificationDelivery['status']): string {
  switch (status) {
    case 'failed':
    case 'dead_letter':
      return 'text-critical';
    case 'sent':
      return 'text-success';
    case 'skipped':
      return 'text-ink-faint';
    case 'pending':
    case 'sending':
      return 'text-warning';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Header notification menu — opens below the bell so it is not clipped by the fixed top bar. */
export function NotificationMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const deliveries = useQuery({
    queryKey: ['notification-deliveries'],
    queryFn: listMyNotificationDeliveries,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = (deliveries.data ?? []).slice(0, 8);
  const attentionCount = (deliveries.data ?? []).filter(
    (item) => item.status === 'failed' || item.status === 'dead_letter',
  ).length;

  return (
    <div className="relative" ref={rootRef}>
      <IconButton
        label="Notifications"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        className={cn('relative', compact && 'h-10 w-10')}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {attentionCount > 0 && (
          <span
            aria-hidden
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-critical"
          />
        )}
      </IconButton>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-line bg-surface shadow-sheet"
        >
          <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Notifications</p>
              <p className="mt-0.5 text-xs text-ink-muted">Delivery activity for this workspace</p>
            </div>
            {attentionCount > 0 && (
              <span className="fi-mono w-fit rounded bg-critical-soft px-2 py-1 text-[10px] uppercase tracking-wider text-critical">
                {attentionCount} need attention
              </span>
            )}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {deliveries.isLoading ? (
              <p className="px-4 py-8 text-sm text-ink-muted">Loading notifications…</p>
            ) : !items.length ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Alerts and digests appear here when delivery activity is recorded.
                </p>
              </div>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id} className="border-b border-line px-4 py-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{templateLabel(item.template_key)}</p>
                      <span className={cn('fi-mono shrink-0 text-[10px] uppercase', statusTone(item.status))}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {item.recipient_type === 'owner' ? 'Owner' : 'Reporter'} ·{' '}
                      {formatTime(item.created_at ?? item.created_date)}
                    </p>
                    {item.last_error_message && (
                      <p className="mt-1 line-clamp-2 text-xs text-critical">{item.last_error_message}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line bg-canvas/50 px-4 py-3">
            <Link
              to="/app/settings#notifications"
              className="text-sm font-medium text-ink hover:underline"
              onClick={() => setOpen(false)}
            >
              Open notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
