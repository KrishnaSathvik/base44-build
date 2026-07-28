import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Copy, Radio, TriangleAlert } from 'lucide-react';
import { Button, SeverityBadge } from '@/components/ui';
import {
  DEMO_ATTENTION_ISSUES,
  DEMO_OPEN_ISSUES,
  DEMO_PRODUCT,
  DEMO_RESOLVED_SEED,
  demoSeverityLabel,
} from '@/pages/demo/demoData';

export function DemoOverviewView({
  walkthroughResolved,
  onOpenIssues,
  onOpenIssue,
}: {
  walkthroughResolved?: boolean;
  onOpenIssues: () => void;
  onOpenIssue: () => void;
}) {
  const openCount = walkthroughResolved
    ? DEMO_OPEN_ISSUES.length - 1
    : DEMO_OPEN_ISSUES.length;
  const resolvedCount = walkthroughResolved ? 2 : 1;
  const attention = walkthroughResolved
    ? DEMO_ATTENTION_ISSUES.filter((issue) => issue.id !== 'demo-issue-chat')
    : DEMO_ATTENTION_ISSUES;

  return (
    <div className="mx-auto min-w-0 max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <div className="flex flex-col gap-5 border-b border-line pb-8">
        <div className="min-w-0">
          <p className="fi-eyebrow">Friday briefing</p>
          <h2 className="fi-display mt-3 break-words text-[1.75rem] font-medium leading-tight sm:text-3xl md:text-[42px]">
            {openCount} issue{openCount === 1 ? '' : 's'} need
            {openCount === 1 ? 's' : ''} attention.
          </h2>
          <p className="mt-3 text-sm text-ink-muted">
            The highest-impact work in {DEMO_PRODUCT}, ordered for review.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full shrink-0 whitespace-nowrap justify-center sm:w-auto sm:self-start"
          disabled
          title="Demo only"
        >
          <Copy className="h-4 w-4 shrink-0" />
          Copy feedback link
        </Button>
      </div>

      <section className="border-b border-line py-8 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <h3 className="fi-display min-w-0 text-xl font-medium sm:text-2xl">Needs attention</h3>
          <button
            type="button"
            onClick={onOpenIssues}
            className="flex shrink-0 items-center gap-1 text-sm text-ink-muted hover:text-ink"
          >
            All issues <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 border-t border-line">
          {attention.map((issue) => (
            <button
              key={issue.id}
              type="button"
              onClick={onOpenIssue}
              className="block w-full border-b border-line py-5 text-left transition hover:bg-surface/60 sm:px-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="fi-mono text-[10px] text-ink-faint">{issue.publicCode}</span>
                  <SeverityBadge
                    severity={issue.severity}
                    label={demoSeverityLabel(issue.severity)}
                  />
                </div>
                <p className="mt-2 break-words text-[15px] font-medium leading-snug">{issue.title}</p>
                <p className="fi-mono mt-2 text-[9px] uppercase leading-4 text-ink-faint">
                  {issue.reportCount} reports · {issue.affectedUserCount} affected · seen{' '}
                  {issue.lastSeen.toLowerCase()}
                </p>
                <p className="fi-display mt-3 text-xl font-medium lg:hidden">
                  {issue.priorityScore}
                  <span className="ml-1 text-xs font-normal text-ink-faint">priority</span>
                </p>
              </div>
              <span className="fi-display hidden self-center text-xl font-medium lg:inline">
                {issue.priorityScore}
                <span className="ml-1 text-xs text-ink-faint">priority</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="border-b border-line py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="fi-display text-xl font-medium sm:text-2xl">Live snapshot</h3>
          <span className="inline-flex items-center gap-2 text-xs text-ink-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live
          </span>
        </div>
        <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-3">
          <SnapshotCard
            icon={<Radio className="h-4 w-4" />}
            title="Connected"
            detail="New reports refresh automatically"
          />
          <SnapshotCard
            icon={<TriangleAlert className="h-4 w-4" />}
            title={`${openCount} open`}
            detail="Across your current project"
          />
          <SnapshotCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            title={`${resolvedCount} resolved`}
            detail="Closed with public notes"
          />
        </div>
      </section>

      <section className="py-8 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <h3 className="fi-display min-w-0 text-xl font-medium sm:text-2xl">Recently resolved</h3>
          <span className="shrink-0 text-sm text-ink-muted">View all</span>
        </div>
        <div className="mt-5 space-y-1">
          <div className="flex items-start justify-between gap-3 border-b border-line py-4 sm:items-center sm:gap-4 sm:px-2">
            <span className="min-w-0 break-words text-sm font-medium leading-snug">
              {DEMO_RESOLVED_SEED.title}
            </span>
            <span className="fi-mono shrink-0 pt-0.5 text-[9px] uppercase text-ink-faint">
              {DEMO_RESOLVED_SEED.resolvedAt}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SnapshotCard({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2 text-ink-muted">{icon}</div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-ink-faint">{detail}</p>
    </div>
  );
}
