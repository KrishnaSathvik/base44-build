import { ArrowRight } from 'lucide-react';
import { Badge, StatusBadge } from '@/components/ui';
import {
  DEMO_ISSUE,
  DEMO_RESOLUTION_NOTE,
  DEMO_RESOLVED_SEED,
  type DemoIssueSummary,
} from '@/pages/demo/demoData';

export function DemoResolvedView({
  walkthroughResolved,
  confirmed,
  notFixed,
  onOpenWalkthrough,
}: {
  walkthroughResolved: boolean;
  confirmed: boolean;
  notFixed: boolean;
  onOpenWalkthrough: () => void;
}) {
  const walkthroughRow: DemoIssueSummary | null =
    walkthroughResolved || notFixed
      ? {
          id: DEMO_ISSUE.id,
          publicCode: DEMO_ISSUE.publicCode,
          title: DEMO_ISSUE.title,
          description: DEMO_ISSUE.description,
          severity: DEMO_ISSUE.severity,
          status: notFixed ? 'reopened' : 'resolved',
          priorityScore: DEMO_ISSUE.priorityScore,
          reportCount: DEMO_ISSUE.reportCount,
          affectedUserCount: DEMO_ISSUE.affectedUserCount,
          lastSeen: DEMO_ISSUE.lastSeen,
          publicResolutionNote: DEMO_RESOLUTION_NOTE,
          resolvedAt: 'Just now',
          confirmationStatus: confirmed ? 'confirmed' : notFixed ? 'not_fixed' : 'pending',
        }
      : null;

  const rows = [walkthroughRow, DEMO_RESOLVED_SEED].filter(Boolean) as DemoIssueSummary[];

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <header className="border-b border-line pb-7">
        <p className="fi-eyebrow">Closed loop</p>
        <h2 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">Resolved</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Resolution outcomes and reporter confirmation, without erasing historical priority.
        </p>
      </header>

      <div>
        {rows.map((issue) => (
          <ResolvedRow
            key={issue.id}
            issue={issue}
            onOpen={issue.id === DEMO_ISSUE.id ? onOpenWalkthrough : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function ResolvedRow({
  issue,
  onOpen,
}: {
  issue: DemoIssueSummary;
  onOpen?: () => void;
}) {
  const confirmationTone =
    issue.confirmationStatus === 'confirmed'
      ? 'success'
      : issue.status === 'reopened' || issue.confirmationStatus === 'not_fixed'
        ? 'critical'
        : 'warning';
  const confirmationText =
    issue.status === 'reopened' || issue.confirmationStatus === 'not_fixed'
      ? 'Not fixed'
      : issue.confirmationStatus === 'confirmed'
        ? 'Reporter confirmed'
        : 'Waiting';
  const confirmationLabel =
    issue.status === 'reopened' || issue.confirmationStatus === 'not_fixed'
      ? 'Reporter says not fixed'
      : issue.confirmationStatus === 'confirmed'
        ? 'Reporter confirmed'
        : 'Awaiting confirmation';
  const statusLabel = issue.status === 'reopened' ? 'Reopened' : 'Resolved';

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="group mt-0 block w-full border-b border-line px-1 py-5 text-left hover:bg-surface disabled:cursor-default disabled:hover:bg-transparent sm:px-2 lg:grid lg:grid-cols-[minmax(0,1fr)_8.5rem_10rem_5rem_auto] lg:items-center lg:gap-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="fi-mono text-[10px] text-ink-faint">{issue.publicCode}</span>
          <StatusBadge status={issue.status} label={statusLabel} />
        </div>
        <p className="mt-2 font-medium leading-snug">{issue.title}</p>
        <p className="mt-2 line-clamp-2 text-xs text-ink-muted lg:line-clamp-1">
          {issue.publicResolutionNote || 'No public resolution note'}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 lg:hidden">
          <Fact label="Resolved" value={issue.resolvedAt ?? '—'} />
          <div>
            <Badge tone={confirmationTone}>{confirmationText}</Badge>
            <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">{confirmationLabel}</p>
          </div>
          <Fact label="Reports" value={String(issue.reportCount)} />
        </div>
      </div>
      <div className="hidden lg:block">
        <Fact label="Resolution date" value={issue.resolvedAt ?? '—'} />
      </div>
      <div className="hidden lg:block">
        <p className="text-xs">{confirmationLabel}</p>
        <Badge tone={confirmationTone}>{confirmationText}</Badge>
      </div>
      <div className="hidden lg:block">
        <Fact label="Reports" value={String(issue.reportCount)} />
      </div>
      <ArrowRight
        className={`hidden h-4 w-4 text-ink-faint transition lg:block ${onOpen ? 'group-hover:translate-x-1' : 'opacity-0'}`}
      />
    </button>
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
