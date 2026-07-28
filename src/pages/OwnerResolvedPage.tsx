import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listMyIssues } from '@/lib/api';
import { useActiveProject } from '@/lib/useActiveProject';
import { formatTime, statusLabel } from '@/lib/format';
import { Badge, EmptyState, Skeleton, StatusBadge } from '@/components/ui';
import { NoProjectOnboarding } from '@/components/NoProjectOnboarding';
import type { WorkflowIssue } from '@/lib/types';

type Filter = 'all' | 'confirmed' | 'pending' | 'reopened';
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Awaiting confirmation' },
  { value: 'reopened', label: 'Reopened' },
];

export function OwnerResolvedPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { project, isLoading: projectsLoading } = useActiveProject();
  const query = useQuery({ queryKey: ['issues'], queryFn: listMyIssues });
  const issues = useMemo(
    () =>
      ((query.data ?? []) as WorkflowIssue[]).filter((issue) => {
        if (issue.project_id !== project?.id) return false;
        return filter === 'reopened'
          ? issue.status === 'reopened'
          : issue.status === 'resolved' &&
              (filter === 'all' || issue.resolution_confirmation_status === filter);
      }),
    [filter, project?.id, query.data],
  );

  if (projectsLoading) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-10 h-48 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <NoProjectOnboarding
        eyebrow="Closed loop"
        title="Create your first feedback board"
        description="Resolved outcomes appear after you create a board, collect reports, and close work with a public note."
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <header className="border-b border-line pb-7">
        <p className="fi-eyebrow">Closed loop</p>
        <h1 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">Resolved</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Resolution outcomes and reporter confirmation, without erasing historical priority.
        </p>
      </header>
      <div
        className="flex gap-2 overflow-x-auto border-b border-line py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Resolved filters"
      >
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`min-h-10 shrink-0 rounded-md px-3 text-xs ${
              filter === item.value ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <div className="space-y-2 py-5">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : !issues.length ? (
        <div className="mt-6">
          <EmptyState
            icon={<Archive className="h-5 w-5" />}
            title={filter === 'reopened' ? 'No reopened issues' : 'No resolved issues yet'}
            description={
              filter === 'reopened'
                ? 'Issues rejected by a reporter will appear here for explicit review.'
                : 'Issues resolved with a public note will remain here as a record.'
            }
          />
        </div>
      ) : (
        <div>
          {issues.map((issue) => {
            const confirmationTone =
              issue.resolution_confirmation_status === 'confirmed'
                ? 'success'
                : issue.status === 'reopened'
                  ? 'critical'
                  : 'warning';
            const confirmationText =
              issue.status === 'reopened'
                ? 'Not fixed'
                : issue.resolution_confirmation_status === 'confirmed'
                  ? 'Reporter confirmed'
                  : 'Waiting';

            return (
              <Link
                key={issue.id}
                to={`/app/issues/${issue.id}`}
                className="group block border-b border-line px-1 py-5 hover:bg-surface sm:px-2 lg:grid lg:grid-cols-[minmax(0,1fr)_8.5rem_10rem_5rem_auto] lg:items-center lg:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="fi-mono text-[10px] text-ink-faint">{issue.public_code}</span>
                    <StatusBadge status={issue.status} label={statusLabel(issue.status)} />
                  </div>
                  <p className="mt-2 font-medium leading-snug">{issue.title}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-ink-muted lg:line-clamp-1">
                    {issue.public_resolution_note || 'No public resolution note'}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-3 lg:hidden">
                    <Fact label="Resolved" value={formatTime(issue.resolved_at)} />
                    <div>
                      <Badge tone={confirmationTone}>{confirmationText}</Badge>
                      <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">
                        {confirmationLabel(issue)}
                      </p>
                    </div>
                    <Fact label="Reports" value={String(issue.report_count ?? 0)} />
                  </div>
                </div>
                <div className="hidden lg:block">
                  <Fact label="Resolution date" value={formatTime(issue.resolved_at)} />
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs">{confirmationLabel(issue)}</p>
                  <Badge tone={confirmationTone}>{confirmationText}</Badge>
                </div>
                <div className="hidden lg:block">
                  <Fact label="Reports" value={String(issue.report_count ?? 0)} />
                </div>
                <ArrowRight className="hidden h-4 w-4 text-ink-faint transition group-hover:translate-x-1 lg:block" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function confirmationLabel(issue: WorkflowIssue) {
  if (issue.status === 'reopened' || issue.resolution_confirmation_status === 'not_fixed') {
    return 'Reporter says not fixed';
  }
  if (issue.resolution_confirmation_status === 'confirmed') return 'Reporter confirmed';
  return 'Awaiting confirmation';
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{value}</p>
      <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">{label}</p>
    </div>
  );
}
