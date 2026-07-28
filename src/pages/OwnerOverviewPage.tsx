import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Copy, Radio, TriangleAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listMyIssues } from '@/lib/api';
import { useActiveProject } from '@/lib/useActiveProject';
import { formatTime, severityLabel } from '@/lib/format';
import { Button, SeverityBadge, Skeleton } from '@/components/ui';
import { NoProjectOnboarding } from '@/components/NoProjectOnboarding';
import { publicBoardUrl } from '@/lib/appUrls';

export function OwnerOverviewPage() {
  const { project, isLoading: projectsLoading } = useActiveProject();
  const issues = useQuery({ queryKey: ['issues'], queryFn: listMyIssues });
  const projectIssues = (issues.data ?? []).filter((item) => item.project_id === project?.id);
  const open = projectIssues.filter((x) => x.status !== 'resolved');
  const resolved = projectIssues.filter((x) => x.status === 'resolved');
  const attention = [...open]
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
    .slice(0, 4);

  if (projectsLoading || issues.isLoading) {
    return (
      <Workspace>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-12 h-80" />
      </Workspace>
    );
  }

  if (!project) return <NoProjectOnboarding eyebrow="Overview" />;

  return (
    <Workspace>
      <div className="flex flex-col gap-6 border-b border-line pb-8">
        <div className="min-w-0">
          <p className="fi-eyebrow">Friday briefing</p>
          <h1 className="fi-display mt-3 text-3xl font-medium leading-tight sm:text-4xl md:text-[42px]">
            {open.length
              ? `${open.length} issue${open.length === 1 ? '' : 's'} need${open.length === 1 ? 's' : ''} attention.`
              : 'Everything is clear today.'}
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            The highest-impact work in {project.name}, ordered for review.
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full shrink-0 whitespace-nowrap justify-center sm:w-auto sm:self-start"
          onClick={() => navigator.clipboard.writeText(publicBoardUrl(project.slug))}
        >
          <Copy className="h-4 w-4 shrink-0" />
          Copy feedback link
        </Button>
      </div>

      <section className="border-b border-line py-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="fi-display text-xl font-medium sm:text-2xl">Needs attention</h2>
          <Link to="/app/issues" className="flex shrink-0 items-center gap-1 text-sm text-ink-muted hover:text-ink">
            All issues <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 border-t border-line">
          {attention.length ? (
            attention.map((issue) => (
              <Link
                key={issue.id}
                to={`/app/issues/${issue.id}`}
                className="grid gap-3 border-b border-line py-5 transition hover:bg-surface/60 sm:grid-cols-[1fr_auto] sm:px-2"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="fi-mono text-[10px] text-ink-faint">{issue.public_code}</span>
                    <SeverityBadge severity={issue.severity ?? 'medium'} label={severityLabel(issue.severity)} />
                  </div>
                  <p className="mt-2 text-[15px] font-medium">{issue.title}</p>
                  <p className="fi-mono mt-2 text-[9px] uppercase text-ink-faint">
                    {issue.report_count ?? 0} reports · {issue.affected_user_count ?? 0} affected · seen{' '}
                    {formatTime(issue.last_seen_at)}
                  </p>
                </div>
                <span className="fi-display self-center text-xl font-medium">
                  {Math.round(issue.priority_score ?? 0)}
                  <span className="ml-1 text-xs text-ink-faint">priority</span>
                </span>
              </Link>
            ))
          ) : (
            <p className="border-b border-line py-10 text-sm text-ink-muted">
              No open issues. New reports will appear here.
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-line py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="fi-display text-xl font-medium sm:text-2xl">Live snapshot</h2>
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
            title={`${open.length} open`}
            detail="Across your current project"
          />
          <SnapshotCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            title={`${resolved.length} resolved`}
            detail="Closed with public notes"
          />
        </div>
      </section>

      <section className="py-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="fi-display text-xl font-medium sm:text-2xl">Recently resolved</h2>
          <Link to="/app/resolved" className="flex shrink-0 items-center gap-1 text-sm text-ink-muted hover:text-ink">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 space-y-1">
          {resolved.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              to={`/app/issues/${item.id}`}
              className="flex items-center justify-between gap-4 border-b border-line py-4 transition hover:bg-surface/60 sm:px-2"
            >
              <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
              <span className="fi-mono shrink-0 text-[9px] uppercase text-ink-faint">
                {formatTime(item.resolved_at)}
              </span>
            </Link>
          ))}
          {!resolved.length && (
            <p className="py-6 text-sm leading-6 text-ink-muted">
              Resolved issues will stay visible here with their public note.
            </p>
          )}
        </div>
      </section>
    </Workspace>
  );
}

function Workspace({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">{children}</div>;
}

function SnapshotCard({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
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
