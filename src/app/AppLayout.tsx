import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Archive, Bell, Inbox, LayoutGrid, LogOut, Settings, SquareKanban } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { AuthPanel } from '@/app/AuthPanel';
import { Brand } from '@/components/Brand';
import { IconButton, Spinner, Tooltip, cn } from '@/components/ui';

const navigation = [
  { to: '/app/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/app/inbox', label: 'Inbox', icon: Inbox },
  { to: '/app/issues', label: 'Issues', icon: SquareKanban },
  { to: '/app/resolved', label: 'Resolved', icon: Archive },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const isIssueDetail = /^\/app\/issues\/[^/]+$/.test(pathname);
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!isAuthenticated || !user) return <AuthPanel />;
  return <div className={cn('min-h-screen bg-canvas md:pb-0', !isIssueDetail && 'pb-20')}>
    <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-line bg-surface"><div className="flex h-full items-center"><div className="flex h-full w-full items-center justify-between px-4 md:w-[228px] md:border-r md:px-5"><Brand /><div className="flex items-center gap-2 md:hidden"><IconButton label="Notifications" className="h-10 w-10"><Bell className="h-4 w-4" /></IconButton></div></div><div className="hidden flex-1 items-center justify-between px-6 md:flex"><div><p className="text-sm font-medium">Workspace</p><p className="fi-mono mt-0.5 text-[9px] uppercase tracking-wider text-ink-faint">Feedback operations</p></div><div className="flex items-center gap-2"><Tooltip label="Notifications"><IconButton label="Notifications"><Bell className="h-4 w-4" /></IconButton></Tooltip><div className="ml-2 border-l border-line pl-4"><p className="max-w-[180px] truncate text-xs text-ink-muted">{user.email}</p></div></div></div></div></header>
    <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-[228px] flex-col border-r border-line bg-surface md:flex"><nav className="space-y-1 p-3">{navigation.map(item => <NavItem key={item.to} {...item} />)}</nav><div className="mt-auto border-t border-line p-3"><NavItem to="/app/settings" label="Settings" icon={Settings} /><button type="button" onClick={() => base44.auth.logout('/')} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-ink-muted hover:bg-surface-subtle hover:text-ink"><LogOut className="h-[17px] w-[17px]" />Sign out</button></div></aside>
    <main className="min-h-screen pt-16 md:pl-[228px]"><Outlet /></main>
    {!isIssueDetail && <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">{navigation.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} className={({isActive}) => cn('flex min-h-11 flex-col items-center justify-center gap-1 text-[10px]', isActive ? 'text-ink' : 'text-ink-faint')}><Icon className="h-5 w-5" />{label}</NavLink>)}<NavLink to="/app/settings" className={({isActive}) => cn('flex min-h-11 flex-col items-center justify-center gap-1 text-[10px]', isActive ? 'text-ink' : 'text-ink-faint')}><Settings className="h-5 w-5" />Settings</NavLink></nav>}
  </div>;
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof LayoutGrid }) { return <NavLink to={to} className={({isActive}) => cn('flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors', isActive ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink')}><Icon className="h-[17px] w-[17px]" />{label}</NavLink>; }
