import { Link } from 'react-router-dom';
import { Brand } from '@/components/Brand';
import { cn } from '@/components/ui';

const FOOTER_LINKS = [
  { to: '/demo', label: 'Demo' },
  { to: '/security', label: 'Security' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
] as const;

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-auto border-t border-line', className)}>
      <div className="fi-container flex flex-col gap-6 py-8 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm text-sm text-ink-muted">
              Feedback intelligence for product teams.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="text-xs text-ink-faint">© 2026 VensaOS</p>
      </div>
    </footer>
  );
}
