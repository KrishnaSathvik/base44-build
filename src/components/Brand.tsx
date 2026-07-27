import { Link } from 'react-router-dom';
import { cn } from '@/components/ui';

export function BrandMark({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <span
      aria-hidden={decorative || undefined}
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-sm bg-[#f3efe5]',
        className ?? 'h-8 w-8',
      )}
    >
      <img
        src="/logo.png"
        alt={decorative ? '' : 'VensaOS logo'}
        draggable={false}
        className="absolute inset-0 h-full w-full scale-[2.55] select-none object-cover"
      />
    </span>
  );
}

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <BrandMark className="h-7 w-7" decorative />
      {!compact && <span className="fi-display text-[17px] font-semibold tracking-[-0.035em]">VensaOS</span>}
    </Link>
  );
}
