import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Archive, Copy, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listMyIssues } from '@/lib/api';
import { useActiveProject } from '@/lib/useActiveProject';
import { formatTime, severityLabel, statusLabel } from '@/lib/format';
import { Button, EmptyState, SeverityBadge, Skeleton, StatusBadge } from '@/components/ui';
import { NoProjectOnboarding } from '@/components/NoProjectOnboarding';
import { publicBoardUrl } from '@/lib/appUrls';

export function OwnerIssuesPage() {
  const resolvedOnly = useLocation().pathname.endsWith('/resolved');
  const { project, isLoading: projectsLoading } = useActiveProject();
  const { data: allIssues, isLoading, isError } = useQuery({ queryKey: ['issues'], queryFn: listMyIssues });

  const issues = allIssues?.filter(
    (issue) =>
      issue.project_id === project?.id &&
      (resolvedOnly
        ? issue.status === 'resolved'
        : !['resolved', 'dismissed', 'duplicate'].includes(issue.status)),
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
        eyebrow={resolvedOnly ? 'Closed loop' : 'Working queue'}
        title="Create your first feedback board"
        description={
          resolvedOnly
            ? 'Resolved issues appear after you create a board, collect reports, and close work with a public note.'
            : 'Issues appear after reporters submit through your public feedback link.'
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <div className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="fi-eyebrow">{resolvedOnly ? 'Closed loop' : 'Working queue'}</p>
          <h1 className="fi-display mt-3 text-3xl font-medium sm:text-4xl">
            {resolvedOnly ? 'Resolved' : 'Issues'}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {resolvedOnly
              ? 'Issues closed with a public explanation.'
              : 'Normalized problems, ordered by the work they demand.'}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="secondary"
            className="w-full justify-center sm:w-auto"
            onClick={() => void navigator.clipboard.writeText(publicBoardUrl(project.slug))}
          >
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Link to="/app/setup" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full justify-center sm:w-auto">
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-7 hidden border-b border-line pb-3 lg:grid lg:grid-cols-[7.5rem_minmax(0,1fr)_4.5rem_4.5rem_7.5rem_7rem] lg:gap-4 lg:px-3">
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Issue</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Title</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Reports</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Affected</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Last seen</span>
        <span className="fi-mono text-right text-[10px] uppercase tracking-wider text-ink-faint">Status</span>
      </div>
      <div className="mt-7 flex items-center justify-between border-b border-line pb-3 lg:hidden">
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Issue</span>
        <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Status</span>
      </div>

      {isLoading ? (
        <div className="space-y-1 py-2">
          {[1, 2, 3, 4].map((x) => (
            <Skeleton key={x} className="h-24" />
          ))}
        </div>
      ) : isError ? (
        <div className="border-b border-critical/30 py-8 text-sm text-critical">
          Issues could not be loaded. Check your connection and try again.
        </div>
      ) : !issues?.length ? (
        <div className="mt-6">
          <EmptyState
            icon={<Archive className="h-5 w-5" />}
            title={resolvedOnly ? 'No resolved issues yet' : 'No issues yet'}
            description={
              resolvedOnly
                ? 'When an issue is resolved with a public note, it will remain here as a record.'
                : 'Share your public feedback link. The first submitted report will become an issue here.'
            }
          />
        </div>
      ) : (
        <div>
          {issues.map((issue) => (
            <Link
              key={issue.id}
              to={`/app/issues/${issue.id}`}
              className="group block border-b border-line px-1 py-5 transition hover:bg-surface/65 sm:px-3 lg:grid lg:grid-cols-[7.5rem_minmax(0,1fr)_4.5rem_4.5rem_7.5rem_7rem] lg:items-center lg:gap-4 lg:py-4"
            >
              <div className="flex items-start justify-between gap-3 lg:block">
                <div className="min-w-0">
                  <span className="fi-mono text-[10px] text-ink-faint">{issue.public_code}</span>
                  <div className="mt-2">
                    <SeverityBadge severity={issue.severity ?? 'medium'} label={severityLabel(issue.severity)} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 lg:hidden">
                  <StatusBadge status={issue.status} label={statusLabel(issue.status)} />
                  <ArrowRight className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              <div className="mt-4 min-w-0 lg:mt-0">
                <p className="line-clamp-2 text-[15px] font-medium leading-snug">{issue.title}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 lg:hidden">
                  <Stat value={String(issue.report_count ?? 0)} label="reports" />
                  <Stat value={String(issue.affected_user_count ?? 0)} label="affected" />
                  <Stat value={formatTime(issue.last_seen_at)} label="last seen" compact />
                </div>
              </div>

              <Stat value={String(issue.report_count ?? 0)} label="reports" className="hidden lg:block" />
              <Stat value={String(issue.affected_user_count ?? 0)} label="affected" className="hidden lg:block" />
              <Stat value={formatTime(issue.last_seen_at)} label="last seen" compact className="hidden lg:block" />

              <div className="hidden items-center justify-end gap-3 lg:flex">
                <StatusBadge status={issue.status} label={statusLabel(issue.status)} />
                <ArrowRight className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
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
      <p className={compact ? 'text-xs leading-5 text-ink-muted' : 'fi-display text-lg font-medium leading-none'}>
        {value}
      </p>
      <p className="fi-mono mt-1 text-[9px] uppercase tracking-wider text-ink-faint">{label}</p>
    </div>
  );
}
