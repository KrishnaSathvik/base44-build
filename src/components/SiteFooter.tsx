import { Brand } from '@/components/Brand';
import { cn } from '@/components/ui';

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-auto border-t border-line', className)}>
      <div className="fi-container flex flex-col gap-4 py-7 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <Brand />
        <p>Built for clear product decisions.</p>
      </div>
    </footer>
  );
}
