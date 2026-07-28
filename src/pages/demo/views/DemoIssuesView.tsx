import { ArrowRight, Copy, Plus } from 'lucide-react';
import { Button, SeverityBadge, StatusBadge } from '@/components/ui';
import { DEMO_ISSUES, DEMO_ISSUE } from '@/pages/demo/demoData';

const STATUS_LABEL: Record<string, string> = {
  testing: 'Testing',
  unreviewed: 'Unreviewed',
  open: 'Open',
  resolved: 'Resolved',
};

export function DemoIssuesView({
  notFixed,
  onOpenIssue,
}: {
  notFixed?: boolean;
  onOpenIssue: (id?: string) => void;
}) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <div className="flex flex-col gap-5 border-b border-line pb-7">
        <div className="min-w-0">
          <p className="fi-eyebrow">Working queue</p>
          <h2 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">Issues</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Normalized problems, ordered by the work they demand.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:self-start">
          <Button
            type="button"
            variant="secondary"
            className="w-full shrink-0 whitespace-nowrap justify-center sm:w-auto"
            disabled
            title="Demo only"
          >
            <Copy className="h-4 w-4 shrink-0" />
            Copy link
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full shrink-0 whitespace-nowrap justify-center sm:w-auto"
            disabled
            title="Demo only"
          >
            <Plus className="h-4 w-4 shrink-0" />
            New project
          </Button>
        </div>
      </div>

      <div className="mt-7 hidden border-b border-line pb-3 lg:grid lg:grid-cols-[7.5rem_minmax(0,1fr)_4.5rem_4.5rem_7.5rem_7rem] lg:gap-4 lg:px-3">
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Issue</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Title</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Reports</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Affected</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Last seen</span>
        <span className="fi-mono text-right text-[10px] uppercase tracking-wider text-ink-faint">
          Status
        </span>
      </div>
      <div className="mt-7 flex items-center justify-between border-b border-line pb-3 lg:hidden">
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Issue</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Status</span>
      </div>

      <div>
        {DEMO_ISSUES.map((issue) => {
          const status =
            issue.id === DEMO_ISSUE.id && notFixed ? 'open' : issue.status;
          return (
            <button
              key={issue.id}
              type="button"
              onClick={() => onOpenIssue(issue.id)}
              className="group block w-full border-b border-line px-1 py-5 text-left transition hover:bg-surface/65 sm:px-3 lg:grid lg:grid-cols-[7.5rem_minmax(0,1fr)_4.5rem_4.5rem_7.5rem_7rem] lg:items-center lg:gap-4 lg:py-4"
            >
              <div className="flex items-start justify-between gap-3 lg:block">
                <div className="min-w-0">
                  <span className="fi-mono text-[10px] text-ink-faint">{issue.publicCode}</span>
                  <div className="mt-2">
                    <SeverityBadge
                      severity={issue.severity}
                      label={issue.severity === 'high' ? 'High' : 'Medium'}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 lg:hidden">
                  <StatusBadge status={status} label={STATUS_LABEL[status] ?? status} />
                  <ArrowRight className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              <div className="mt-4 min-w-0 lg:mt-0">
                <p className="line-clamp-2 text-[15px] font-medium leading-snug">{issue.title}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 lg:hidden">
                  <Stat value={String(issue.reportCount)} label="reports" />
                  <Stat value={String(issue.affectedUserCount)} label="affected" />
                  <Stat value={issue.lastSeen} label="last seen" compact />
                </div>
              </div>

              <Stat
                value={String(issue.reportCount)}
                label="reports"
                className="hidden lg:block"
              />
              <Stat
                value={String(issue.affectedUserCount)}
                label="affected"
                className="hidden lg:block"
              />
              <Stat value={issue.lastSeen} label="last seen" compact className="hidden lg:block" />

              <div className="hidden items-center justify-end gap-3 lg:flex">
                <StatusBadge status={status} label={STATUS_LABEL[status] ?? status} />
                <ArrowRight className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  compact = false,
  className,
}: {
  value: string;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p
        className={
          compact
            ? 'text-xs leading-5 text-ink-muted'
            : 'fi-display text-lg font-medium leading-none'
        }
      >
        {value}
      </p>
      <p className="fi-mono mt-1 text-[9px] uppercase tracking-wider text-ink-faint">{label}</p>
    </div>
  );
}
