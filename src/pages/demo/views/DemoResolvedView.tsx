import { ArrowRight } from 'lucide-react';
import { Badge, StatusBadge } from '@/components/ui';
import { DEMO_ISSUE, DEMO_RESOLUTION_NOTE } from '@/pages/demo/demoData';

export function DemoResolvedView({
  resolved,
  confirmed,
  notFixed,
  onOpenIssue,
}: {
  resolved: boolean;
  confirmed: boolean;
  notFixed: boolean;
  onOpenIssue: () => void;
}) {
  if (!resolved && !notFixed) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
        <header className="border-b border-line pb-7">
          <p className="fi-eyebrow">Closed loop</p>
          <h2 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">Resolved</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Resolution outcomes and reporter confirmation, without erasing historical priority.
          </p>
        </header>
        <p className="mt-8 text-sm text-ink-muted">
          No resolved issues yet. Resolve the grouped chat issue with a public message to see it
          here.
        </p>
        <button
          type="button"
          onClick={onOpenIssue}
          className="mt-4 text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Open the grouped issue
        </button>
      </div>
    );
  }

  const status = notFixed ? 'reopened' : 'resolved';
  const statusLabel = notFixed ? 'Reopened' : 'Resolved';
  const confirmationTone = confirmed ? 'success' : notFixed ? 'critical' : 'warning';
  const confirmationText = confirmed
    ? 'Reporter confirmed'
    : notFixed
      ? 'Not fixed'
      : 'Waiting';
  const confirmationLabel = confirmed
    ? 'Reporter confirmed'
    : notFixed
      ? 'Reporter says not fixed'
      : 'Awaiting confirmation';

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <header className="border-b border-line pb-7">
        <p className="fi-eyebrow">Closed loop</p>
        <h2 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">Resolved</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Resolution outcomes and reporter confirmation, without erasing historical priority.
        </p>
      </header>

      <button
        type="button"
        onClick={onOpenIssue}
        className="group mt-2 block w-full border-b border-line px-1 py-5 text-left hover:bg-surface sm:px-2 lg:grid lg:grid-cols-[minmax(0,1fr)_8.5rem_10rem_5rem_auto] lg:items-center lg:gap-4"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="fi-mono text-[10px] text-ink-faint">{DEMO_ISSUE.publicCode}</span>
            <StatusBadge status={status} label={statusLabel} />
          </div>
          <p className="mt-2 font-medium leading-snug">{DEMO_ISSUE.title}</p>
          <p className="mt-2 line-clamp-2 text-xs text-ink-muted lg:line-clamp-1">
            {DEMO_RESOLUTION_NOTE}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 lg:hidden">
            <Fact label="Resolved" value="Just now" />
            <div>
              <Badge tone={confirmationTone}>{confirmationText}</Badge>
              <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">{confirmationLabel}</p>
            </div>
            <Fact label="Reports" value={String(DEMO_ISSUE.reportCount)} />
          </div>
        </div>
        <div className="hidden lg:block">
          <Fact label="Resolution date" value="Just now" />
        </div>
        <div className="hidden lg:block">
          <p className="text-xs">{confirmationLabel}</p>
          <Badge tone={confirmationTone}>{confirmationText}</Badge>
        </div>
        <div className="hidden lg:block">
          <Fact label="Reports" value={String(DEMO_ISSUE.reportCount)} />
        </div>
        <ArrowRight className="hidden h-4 w-4 text-ink-faint transition group-hover:translate-x-1 lg:block" />
      </button>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{value}</p>
      <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">{label}</p>
    </div>
  );
}
