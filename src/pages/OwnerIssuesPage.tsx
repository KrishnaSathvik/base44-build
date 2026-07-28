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

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto] border-b border-line pb-3">
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
              className="group relative block min-h-[124px] border-b border-line px-1 py-5 transition hover:bg-surface/65 sm:grid sm:min-h-[104px] sm:grid-cols-[110px_minmax(220px,1fr)_110px_140px_90px_auto] sm:items-center sm:gap-4 sm:px-3"
            >
              <div className="flex items-center gap-3 pr-20 sm:flex-col sm:items-start sm:gap-2 sm:pr-0">
                <span className="fi-mono text-[10px] text-ink-faint">{issue.public_code}</span>
                <SeverityBadge severity={issue.severity ?? 'medium'} label={severityLabel(issue.severity)} />
              </div>
              <div className="mt-4 min-w-0 sm:mt-0">
                <p className="line-clamp-2 text-[15px] font-medium sm:truncate">{issue.title}</p>
                <p className="fi-mono mt-2 text-[9px] uppercase text-ink-faint sm:hidden">
                  {issue.report_count ?? 0} reports · {issue.affected_user_count ?? 0} affected
                </p>
              </div>
              <Stat value={String(issue.report_count ?? 0)} label="reports" />
              <Stat value={String(issue.affected_user_count ?? 0)} label="affected" />
              <div className="hidden sm:block">
                <p className="text-xs text-ink-muted">{formatTime(issue.last_seen_at)}</p>
                <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">last seen</p>
              </div>
              <div className="absolute right-1 top-5 flex items-center gap-3 sm:static">
                <StatusBadge status={issue.status} label={statusLabel(issue.status)} />
                <ArrowRight className="hidden h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1 sm:block" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="hidden sm:block">
      <p className="fi-display text-lg font-medium">{value}</p>
      <p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p>
    </div>
  );
}
