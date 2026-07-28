import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';
import {
  DEMO_INBOX_ITEMS,
  DEMO_ISSUE,
  type DemoInboxItem,
  type DemoInboxReason,
} from '@/pages/demo/demoData';

const INBOX_FILTERS: Array<{ value: 'all' | DemoInboxReason; label: string }> = [
  { value: 'all', label: 'All attention' },
  { value: 'Possible duplicate', label: 'Possible duplicates' },
  { value: 'Processing failed', label: 'Processing failed' },
  { value: 'Needs information', label: 'Needs information' },
  { value: 'Reporter replied', label: 'Reporter replied' },
];

function badgeTone(reason: DemoInboxReason): 'critical' | 'info' | 'warning' {
  switch (reason) {
    case 'Processing failed':
      return 'critical';
    case 'Reporter replied':
      return 'info';
    case 'Possible duplicate':
    case 'Needs information':
      return 'warning';
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function useIsMobileInboxLayout() {
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobileLayout(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return isMobileLayout;
}

export function DemoInboxView({
  onOpenIssue,
  onReviewDuplicate,
}: {
  onOpenIssue: () => void;
  onReviewDuplicate: () => void;
}) {
  const [filter, setFilter] = useState<(typeof INBOX_FILTERS)[number]['value']>('all');
  const [selectedId, setSelectedId] = useState(DEMO_INBOX_ITEMS[0]?.id ?? '');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const isMobileLayout = useIsMobileInboxLayout();

  const filtered = useMemo(
    () =>
      DEMO_INBOX_ITEMS.filter((item) => (filter === 'all' ? true : item.reason === filter)),
    [filter],
  );

  useEffect(() => {
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? '');
      setMobileShowDetail(false);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const showList = !isMobileLayout || !mobileShowDetail;
  const showDetail = Boolean(selected) && (!isMobileLayout || mobileShowDetail);

  return (
    <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-8 sm:px-7 md:py-10">
      <header className="border-b border-line pb-7">
        <p className="fi-eyebrow">Exceptions</p>
        <h2 className="fi-display mt-3 break-words text-3xl font-medium sm:text-4xl">Inbox</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Failed processing, duplicate matches, and reporter replies that need a decision. Everyday
          unreviewed work lives in Issues.
        </p>
      </header>

      <div
        className="flex gap-2 overflow-x-auto border-b border-line py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Inbox filters"
      >
        {INBOX_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setFilter(item.value);
              setMobileShowDetail(false);
            }}
            className={cn(
              'min-h-10 shrink-0 rounded-md px-3 text-xs',
              filter === item.value ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="mt-6 rounded-xl border border-dashed border-line px-5 py-10 text-sm text-ink-muted">
          Nothing matches this filter right now.
        </div>
      ) : (
        <div className="grid min-h-0 min-w-0 lg:min-h-[620px] lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div
            className={cn(
              'min-w-0 border-line lg:border-r',
              showList ? '' : 'hidden',
            )}
          >
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  if (isMobileLayout) setMobileShowDetail(true);
                }}
                className={cn(
                  'block w-full border-b border-line px-3 py-4 text-left sm:px-4',
                  selected?.id === item.id ? 'bg-canvas' : 'hover:bg-surface-subtle',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="fi-mono min-w-0 truncate text-[9px] uppercase text-ink-faint">
                    {item.typeLabel} · {item.when}
                  </p>
                  {item.reason === 'Reporter replied' ? (
                    <span
                      aria-label="Unread reporter message"
                      className="h-2 w-2 shrink-0 rounded-full bg-critical"
                    />
                  ) : null}
                </div>
                <p className="mt-3 line-clamp-2 break-words text-sm font-medium leading-snug">
                  {item.title}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone={badgeTone(item.reason)}>{item.reason}</Badge>
                  {item.publicCode ? (
                    <span className="fi-mono text-[9px] text-ink-faint">{item.publicCode}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          {showDetail && selected ? (
            <div className={cn('min-w-0', showDetail ? '' : 'hidden')}>
              <InboxDetail
                item={selected}
                onBack={() => setMobileShowDetail(false)}
                onOpenIssue={onOpenIssue}
                onReviewDuplicate={onReviewDuplicate}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function InboxDetail({
  item,
  onBack,
  onOpenIssue,
  onReviewDuplicate,
}: {
  item: DemoInboxItem;
  onBack: () => void;
  onOpenIssue: () => void;
  onReviewDuplicate: () => void;
}) {
  return (
    <div className="min-w-0 p-1 sm:p-2 lg:p-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-ink lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Inbox
      </button>
      <Badge tone={badgeTone(item.reason)}>{item.reason}</Badge>
      <h3 className="fi-display mt-4 break-words text-xl font-medium leading-tight sm:text-2xl">
        {item.title}
      </h3>
      <blockquote className="mt-5 break-words border-l-2 border-critical pl-4 text-sm leading-6 sm:text-base sm:leading-7">
        {item.body}
      </blockquote>
      <p className="mt-4 break-words text-sm leading-6 text-ink-muted">{item.detail}</p>
      {item.meta ? (
        <p className="fi-mono mt-3 break-words text-[10px] text-ink-faint">{item.meta}</p>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {item.reason === 'Possible duplicate' ? (
          <>
            <Button type="button" className="w-full sm:w-auto" onClick={onReviewDuplicate}>
              Review suggestion
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={onOpenIssue}
            >
              Review in Issues
            </Button>
          </>
        ) : null}
        {item.reason === 'Processing failed' ? (
          <>
            <Button type="button" className="w-full sm:w-auto" disabled title="Disabled in demo">
              Retry processing
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled
              title="Disabled in demo"
            >
              Open raw report
            </Button>
          </>
        ) : null}
        {item.reason === 'Needs information' ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onOpenIssue}
          >
            Open related issue
          </Button>
        ) : null}
        {item.reason === 'Reporter replied' ? (
          <>
            <Button type="button" className="w-full sm:w-auto" disabled title="Disabled in demo">
              Mark as read
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={onOpenIssue}
            >
              Continue in Issues
            </Button>
          </>
        ) : null}
      </div>
      {item.reason === 'Possible duplicate' ? (
        <p className="mt-4 text-xs text-ink-faint">
          Suggested against {DEMO_ISSUE.publicCode} · owner decision required
        </p>
      ) : null}
    </div>
  );
}
