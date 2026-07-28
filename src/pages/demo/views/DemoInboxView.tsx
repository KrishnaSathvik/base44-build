import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';
import { DEMO_DUPLICATE, DEMO_ISSUE } from '@/pages/demo/demoData';

const INBOX_FILTERS = [
  'All attention',
  'Possible duplicates',
  'Processing failed',
  'Needs information',
  'Reporter replied',
] as const;

export function DemoInboxView({
  onOpenIssue,
  onReviewDuplicate,
}: {
  onOpenIssue: () => void;
  onReviewDuplicate: () => void;
}) {
  const [filter, setFilter] = useState<(typeof INBOX_FILTERS)[number]>('All attention');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobileLayout(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const showDuplicate =
    filter === 'All attention' || filter === 'Possible duplicates';
  const showList = !isMobileLayout || !mobileShowDetail;
  const showDetail = showDuplicate && (!isMobileLayout || mobileShowDetail);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-7 md:py-10">
      <header className="border-b border-line pb-7">
        <p className="fi-eyebrow">Exceptions</p>
        <h2 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">Inbox</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Failed processing, duplicate matches, and reporter replies that need a decision. Everyday
          unreviewed work lives in Issues.
        </p>
      </header>

      <div
        className="flex gap-2 overflow-x-auto border-b border-line py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Inbox filters"
      >
        {INBOX_FILTERS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setFilter(label);
              setMobileShowDetail(false);
            }}
            className={cn(
              'min-h-10 shrink-0 rounded-md px-3 text-xs',
              filter === label ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {!showDuplicate ? (
        <div className="mt-6 rounded-xl border border-dashed border-line px-5 py-10 text-sm text-ink-muted">
          Nothing matches this filter right now.
        </div>
      ) : (
        <div className="grid min-h-0 lg:min-h-[620px] lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className={cn('border-line lg:border-r', showList ? '' : 'hidden')}>
            <button
              type="button"
              onClick={() => {
                if (isMobileLayout) setMobileShowDetail(true);
                else onReviewDuplicate();
              }}
              className="block w-full border-b border-line bg-canvas px-4 py-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="fi-mono text-[9px] text-ink-faint">BUG · TODAY</p>
                <Badge tone="warning">Possible duplicate</Badge>
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-medium">{DEMO_DUPLICATE.title}</p>
              <p className="fi-mono mt-3 text-[9px] text-ink-faint">{DEMO_DUPLICATE.publicCode}</p>
            </button>
            <p className="px-4 py-8 text-sm text-ink-muted">
              Inbox is otherwise clear. New unreviewed issues appear in Issues.
            </p>
          </div>

          {showDetail ? (
            <div className="p-1 sm:p-2">
              <button
                type="button"
                onClick={() => setMobileShowDetail(false)}
                className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-ink lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Inbox
              </button>
              <Badge tone="warning">Possible duplicate</Badge>
              <h3 className="fi-display mt-4 text-2xl font-medium leading-tight">
                {DEMO_DUPLICATE.title}
              </h3>
              <blockquote className="mt-5 border-l-2 border-critical pl-4 text-base leading-7">
                {DEMO_DUPLICATE.body}
              </blockquote>
              <p className="mt-4 text-sm leading-6 text-ink-muted">{DEMO_DUPLICATE.reason}</p>
              <p className="fi-mono mt-3 text-[10px] text-ink-faint">
                {DEMO_DUPLICATE.confidence}% confidence · suggested against {DEMO_ISSUE.publicCode}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button type="button" onClick={onReviewDuplicate}>
                  Review suggestion
                </Button>
                <Button type="button" variant="secondary" onClick={onOpenIssue}>
                  Review in Issues
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
