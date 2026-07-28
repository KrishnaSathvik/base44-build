import type { ReactNode } from 'react';
import { Archive, Bell, Inbox, LayoutGrid, Settings, SquareKanban } from 'lucide-react';
import { BrandMark } from '@/components/Brand';
import { cn } from '@/components/ui';
import { DEMO_PRODUCT, type DemoView } from '@/pages/demo/demoData';

const NAV: Array<{
  id: Exclude<DemoView, 'detail' | 'duplicate' | 'tracking'>;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'issues', label: 'Issues', icon: SquareKanban },
  { id: 'resolved', label: 'Resolved', icon: Archive },
];

function activeNav(view: DemoView): (typeof NAV)[number]['id'] {
  switch (view) {
    case 'overview':
      return 'overview';
    case 'inbox':
    case 'duplicate':
      return 'inbox';
    case 'issues':
    case 'detail':
      return 'issues';
    case 'resolved':
    case 'tracking':
      return 'resolved';
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function DemoAppShell({
  view,
  toast,
  hideMobileNav,
  onNavigate,
  children,
}: {
  view: DemoView;
  toast?: string | null;
  hideMobileNav?: boolean;
  onNavigate: (next: DemoView) => void;
  children: ReactNode;
}) {
  const current = activeNav(view);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-canvas shadow-sheet">
      <div
        role="status"
        className="border-b border-info/25 bg-info-soft/40 px-4 py-2.5 text-center text-xs text-ink-muted"
      >
        Demo data — nothing is saved.
      </div>

      <header className="flex min-h-14 flex-col justify-center gap-1 border-b border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <div className="flex items-center gap-3">
          <BrandMark className="h-7 w-7" decorative />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{DEMO_PRODUCT}</p>
            <p className="fi-mono mt-0.5 text-[9px] uppercase tracking-wider text-ink-faint">
              Feedback operations · demo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {toast ? (
            <p className="max-w-full text-xs text-ink-muted sm:max-w-sm sm:text-right">{toast}</p>
          ) : null}
          <button
            type="button"
            disabled
            title="Notifications are disabled in the demo"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-faint"
            aria-label="Notifications (demo)"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-surface lg:flex lg:flex-col">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{DEMO_PRODUCT}</p>
            <p className="fi-mono mt-0.5 text-[9px] uppercase tracking-wider text-ink-faint">
              Active project
            </p>
          </div>
          <nav className="space-y-1 p-3" aria-label="Demo workspace">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors',
                  current === id
                    ? 'bg-ink text-white'
                    : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
                )}
              >
                <Icon className="h-[17px] w-[17px]" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto border-t border-line p-3">
            <button
              type="button"
              disabled
              title="Settings are disabled in the demo"
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-ink-faint"
            >
              <Settings className="h-[17px] w-[17px]" />
              Settings
            </button>
          </div>
        </aside>

        <div className={cn('min-h-[640px]', !hideMobileNav && 'pb-16 lg:pb-0')}>
          {!hideMobileNav ? (
            <div className="flex gap-2 overflow-x-auto border-b border-line p-3 lg:hidden">
              {NAV.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={cn(
                    'min-h-10 shrink-0 rounded-md px-3 text-xs',
                    current === id ? 'bg-ink text-white' : 'text-ink-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
