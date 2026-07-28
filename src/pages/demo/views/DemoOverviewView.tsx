import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Copy, Radio, TriangleAlert } from 'lucide-react';
import { Button, SeverityBadge } from '@/components/ui';
import { DEMO_ISSUE, DEMO_PRODUCT } from '@/pages/demo/demoData';

export function DemoOverviewView({ onOpenIssue }: { onOpenIssue: () => void }) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <div className="flex flex-col gap-6 border-b border-line pb-8">
        <div className="min-w-0">
          <p className="fi-eyebrow">Friday briefing</p>
          <h2 className="fi-display mt-3 text-3xl font-medium leading-tight sm:text-4xl md:text-[42px]">
            1 issue needs attention.
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

      <section className="border-b border-line py-10">
        <div className="flex items-center justify-between gap-3">
          <h3 className="fi-display text-xl font-medium sm:text-2xl">Needs attention</h3>
          <button
            type="button"
            onClick={onOpenIssue}
            className="flex shrink-0 items-center gap-1 text-sm text-ink-muted hover:text-ink"
          >
            All issues <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 border-t border-line">
          <button
            type="button"
            onClick={onOpenIssue}
            className="grid w-full gap-3 border-b border-line py-5 text-left transition hover:bg-surface/60 sm:grid-cols-[1fr_auto] sm:px-2"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="fi-mono text-[10px] text-ink-faint">{DEMO_ISSUE.publicCode}</span>
                <SeverityBadge severity={DEMO_ISSUE.severity} label="High" />
              </div>
              <p className="mt-2 text-[15px] font-medium">{DEMO_ISSUE.title}</p>
              <p className="fi-mono mt-2 text-[9px] uppercase text-ink-faint">
                {DEMO_ISSUE.reportCount} reports · {DEMO_ISSUE.affectedUserCount} affected · seen today
              </p>
            </div>
            <span className="fi-display self-center text-xl font-medium">
              {DEMO_ISSUE.priorityScore}
              <span className="ml-1 text-xs text-ink-faint">priority</span>
            </span>
          </button>
        </div>
      </section>

      <section className="border-b border-line py-10">
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
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <SnapshotCard
            icon={<Radio className="h-4 w-4" />}
            title="Connected"
            detail="New reports refresh automatically"
          />
          <SnapshotCard
            icon={<TriangleAlert className="h-4 w-4" />}
            title="1 open"
            detail="Across your current project"
          />
          <SnapshotCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="0 resolved"
            detail="Closed with public notes"
          />
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
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2 text-ink-muted">{icon}</div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-ink-faint">{detail}</p>
    </div>
  );
}
