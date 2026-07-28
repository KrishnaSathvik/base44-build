import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Archive, Inbox, LayoutGrid, LogOut, Settings, SquareKanban } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useFreeMaintenance } from '@/lib/useFreeMaintenance';
import { useOwnerRealtime } from '@/lib/useOwnerRealtime';
import { useActiveProject } from '@/lib/useActiveProject';
import { AuthPanel } from '@/app/AuthPanel';
import { Brand } from '@/components/Brand';
import { NotificationMenu } from '@/components/NotificationMenu';
import { ProjectSwitcher } from '@/components/ProjectSwitcher';
import { Spinner, StatusBadge, cn } from '@/components/ui';
import { useNetworkState } from '@/app/NetworkStateProvider';
import { clearOwnerSnapshots, loadOwnerSnapshots, saveOwnerSnapshot, toOwnerIssueSummary } from '@/lib/ownerSnapshot';
import type { OwnerSnapshot } from '@/lib/ownerSnapshot';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listMyIssues } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';
import { statusLabel } from '@/lib/format';

const navigation = [
  { to: '/app/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/app/inbox', label: 'Inbox', icon: Inbox },
  { to: '/app/issues', label: 'Issues', icon: SquareKanban },
  { to: '/app/resolved', label: 'Resolved', icon: Archive },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const networkState = useNetworkState();
  const queryClient = useQueryClient();
  const isIssueDetail = /^\/app\/issues\/[^/]+$/.test(pathname);
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const maintenance = useFreeMaintenance(!!user && isAuthenticated && networkState !== 'offline');
  useOwnerRealtime(!!user && isAuthenticated && networkState !== 'offline');
  const { projects, project, setActiveProjectId } = useActiveProject({
    enabled: !!user && isAuthenticated && networkState !== 'offline',
  });
  const issues = useQuery({
    queryKey: ['issues'],
    queryFn: listMyIssues,
    enabled: !!user && networkState !== 'offline',
  });
  const [offlineSnapshots, setOfflineSnapshots] = useState<OwnerSnapshot[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const previousOpenCount = useRef<number | null>(null);

  useEffect(() => {
    if (!issues.data || !project) return;
    const openCount = issues.data.filter(
      (issue) =>
        issue.project_id === project.id &&
        !['resolved', 'dismissed', 'duplicate'].includes(issue.status),
    ).length;
    if (previousOpenCount.current !== null && openCount > previousOpenCount.current) {
      const added = openCount - previousOpenCount.current;
      setLiveAnnouncement(
        added === 1 ? 'A new issue needs attention.' : `${added} new issues need attention.`,
      );
    }
    previousOpenCount.current = openCount;
  }, [issues.data, project]);

  useEffect(() => {
    if (networkState === 'online' && user && projects.length && issues.data) {
      for (const item of projects) {
        void saveOwnerSnapshot({
          userId: user.email,
          projectId: item.id,
          savedAt: Date.now(),
          issues: issues.data
            .filter((issue) => issue.project_id === item.id)
            .map(toOwnerIssueSummary),
        }).catch(() => undefined);
      }
    }
  }, [issues.data, networkState, projects, user]);

  useEffect(() => {
    if (networkState === 'offline' && user) {
      void loadOwnerSnapshots(user.email)
        .then(setOfflineSnapshots)
        .catch(() => setOfflineSnapshots([]));
    }
  }, [networkState, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!isAuthenticated || !user) return <AuthPanel />;

  return (
    <div className={cn('min-h-screen bg-canvas md:pb-0', !isIssueDetail && 'pb-20')}>
      <span className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </span>
      <header className="fixed inset-x-0 top-0 z-40 h-16 overflow-visible border-b border-line bg-surface">
        <div className="flex h-full items-center">
          <div className="flex h-full w-full items-center justify-between px-4 md:w-[228px] md:border-r md:px-5">
            <Brand />
            <div className="flex items-center gap-2 md:hidden">
              <NotificationMenu compact />
            </div>
          </div>
          <div className="hidden flex-1 items-center justify-between px-6 md:flex">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{project?.name ?? 'VensaOS workspace'}</p>
              <p className="fi-mono mt-0.5 text-[9px] uppercase tracking-wider text-ink-faint">
                Feedback operations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationMenu />
              <div className="ml-2 border-l border-line pl-4">
                <p className="max-w-[180px] truncate text-xs text-ink-muted">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-[228px] flex-col border-r border-line bg-surface md:flex">
        <div className="border-b border-line py-3">
          <ProjectSwitcher
            projects={projects}
            project={project}
            onChange={setActiveProjectId}
          />
        </div>
        <nav className="space-y-1 p-3">
          {navigation.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-auto border-t border-line p-3">
          <NavItem to="/app/settings" label="Settings" icon={Settings} />
          <button
            type="button"
            onClick={() =>
              void (async () => {
                await clearOwnerSnapshots(user.email);
                queryClient.clear();
                await base44.auth.logout('/');
              })()
            }
            className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-ink-muted hover:bg-surface-subtle hover:text-ink"
          >
            <LogOut className="h-[17px] w-[17px]" />
            Sign out
          </button>
        </div>
      </aside>

      <main
        className="min-h-screen pt-16 md:pl-[228px]"
        onClickCapture={(event) => {
          if (
            networkState === 'offline' &&
            event.target instanceof Element &&
            event.target.closest('button:not([data-offline-safe]), form')
          ) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {networkState === 'offline' ? (
          <OwnerOfflineSnapshot snapshots={offlineSnapshots} />
        ) : (
          <>
            {projects.length > 1 && project ? (
              <div className="border-b border-line px-4 py-2 md:hidden">
                <ProjectSwitcher
                  projects={projects}
                  project={project}
                  onChange={setActiveProjectId}
                  className="px-0"
                />
              </div>
            ) : null}
            <Outlet />
            {maintenance.warning && (
              <div
                role="status"
                className="fixed bottom-24 left-4 right-4 z-40 rounded-lg border border-warning/35 bg-warning-soft px-4 py-3 text-xs text-warning md:bottom-6 md:left-[244px] md:right-6"
              >
                {maintenance.warning}
              </div>
            )}
          </>
        )}
      </main>

      {!isIssueDetail && (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[9px] leading-tight sm:text-[10px]',
                  isActive ? 'text-ink' : 'text-ink-faint',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              cn(
                'flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[9px] leading-tight sm:text-[10px]',
                isActive ? 'text-ink' : 'text-ink-faint',
              )
            }
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="truncate">Settings</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors',
          isActive ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
        )
      }
    >
      <Icon className="h-[17px] w-[17px]" />
      {label}
    </NavLink>
  );
}

function OwnerOfflineSnapshot({ snapshots }: { snapshots: OwnerSnapshot[] }) {
  const recent = [...snapshots].sort((a, b) => b.savedAt - a.savedAt)[0];
  return (
    <div>
      <div
        role="status"
        className="border-b border-warning/30 bg-warning-soft px-4 py-3 text-center text-xs text-warning"
      >
        Showing the last saved snapshot. Changes, retries, and replies are unavailable offline.
      </div>
      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-7">
        <p className="fi-eyebrow">Offline snapshot</p>
        <h1 className="fi-display mt-3 text-4xl font-medium">Recent issues</h1>
        <p className="mt-2 text-xs text-ink-muted">
          {recent
            ? `Saved ${new Date(recent.savedAt).toLocaleString()}`
            : 'No snapshot has been saved for this account.'}
        </p>
        <div className="mt-8">
          {recent?.issues.map((issue) => (
            <div
              key={issue.publicCode}
              className="grid min-h-[96px] grid-cols-[1fr_auto] items-center border-b border-line py-4"
            >
              <div>
                <p className="fi-mono text-[10px] text-ink-faint">{issue.publicCode}</p>
                <p className="mt-2 text-sm font-medium">{issue.title}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {issue.reportCount ?? 0} reports · Priority {Math.round(issue.priorityScore ?? 0)}
                </p>
              </div>
              <StatusBadge status={issue.status} label={statusLabel(issue.status)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
