import { Link } from 'react-router-dom';
import { cn } from '@/components/ui';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-sm bg-[#f3efe5]',
        className ?? 'h-8 w-8',
      )}
    >
      <img
        src="/logo.png"
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full scale-[2.55] select-none object-cover"
      />
    </span>
  );
}

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <BrandMark className="h-7 w-7" />
      {!compact && <span className="fi-display text-[17px] font-semibold tracking-[-0.035em]">Feedback Inbox</span>}
    </Link>
  );
}
