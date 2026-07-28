import { forwardRef, useEffect, useRef } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, Check, Upload, X } from 'lucide-react';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant }

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'border-ink bg-ink text-[#faf9f5] hover:bg-[#30302e]',
    secondary: 'border-line-strong bg-surface text-ink hover:border-ink',
    ghost: 'border-transparent bg-transparent text-ink-muted hover:bg-surface-subtle hover:text-ink',
    danger: 'border-critical bg-critical text-white hover:bg-[#d93434]',
  };
  return <button className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas', variants[variant], className)} {...props} />;
}

export function IconButton({ label, className, ...props }: ButtonProps & { label: string }) {
  return <button aria-label={label} title={label} className={cn('inline-flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-ink-muted transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink', className)} {...props} />;
}

const fieldClass = 'w-full min-h-11 rounded-md border border-line bg-surface px-3.5 text-base text-ink placeholder:text-ink-faint transition focus-visible:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 disabled:bg-surface-subtle disabled:text-ink-faint';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) { return <input ref={ref} className={cn(fieldClass, className)} {...props} />; });
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) { return <textarea ref={ref} className={cn(fieldClass, 'min-h-[120px] resize-y py-3 leading-relaxed', className)} {...props} />; });
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) { return <select ref={ref} className={cn(fieldClass, className)} {...props} />; });

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }>(function Checkbox({ label, description, ...props }, ref) {
  return <label className="flex cursor-pointer items-start gap-3 text-sm"><input ref={ref} type="checkbox" className="peer sr-only" {...props} /><span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line-strong bg-surface text-transparent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink"><Check className="h-3.5 w-3.5" /></span><span><span className="block text-ink">{label}</span>{description && <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{description}</span>}</span></label>;
});

export function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-6 w-10 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink', checked ? 'border-ink bg-ink' : 'border-line-strong bg-surface-subtle')}><span className={cn('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} /></button>;
}

export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode }) {
  return <div className="space-y-2"><div className="flex items-baseline justify-between gap-3"><label htmlFor={htmlFor} className="text-sm font-medium text-ink">{label}</label>{hint && !error && <span className="text-xs text-ink-faint">{hint}</span>}</div>{children}{error && <InlineError>{error}</InlineError>}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'critical' | 'warning' | 'success' | 'info' }) {
  const tones = { neutral: 'bg-surface-subtle text-ink-muted', critical: 'bg-critical-soft text-critical', warning: 'bg-warning-soft text-warning', success: 'bg-success-soft text-success', info: 'bg-info-soft text-info' };
  return <span className={cn('fi-mono inline-flex items-center rounded px-2 py-1 text-[10px] font-medium uppercase tracking-[.08em]', tones[tone])}>{children}</span>;
}
export function StatusBadge({ status, label }: { status: string; label: string }) { return <Badge tone={status === 'resolved' ? 'success' : status === 'needs_info' || status === 'processing' ? 'warning' : status === 'dismissed' || status === 'duplicate' ? 'neutral' : 'info'}>{label}</Badge>; }
export function SeverityBadge({ severity, label }: { severity: string; label: string }) { return <span className="inline-flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', severity === 'critical' ? 'bg-critical' : severity === 'high' ? 'bg-warning' : severity === 'low' ? 'bg-ink-faint' : 'bg-info')} /><span className="fi-mono text-[10px] uppercase tracking-[.08em] text-ink-muted">{label}</span></span>; }

export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100',
          side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
        )}
      >
        {label}
      </span>
    </span>
  );
}
export function Dropdown({ label, children }: { label: ReactNode; children: ReactNode }) { return <details className="relative"><summary className="list-none cursor-pointer">{label}</summary><div className="absolute right-0 top-full z-50 mt-2 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-sheet">{children}</div></details>; }
function useFocusTrap<T extends HTMLElement>(open:boolean,onClose:()=>void){const ref=useRef<T>(null);useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const node=ref.current;const focusable=()=>Array.from(node?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')??[]);focusable()[0]?.focus();const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose();return;}if(event.key!=='Tab')return;const items=focusable();if(!items.length)return;const first=items[0];const last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};document.addEventListener('keydown',keydown);return()=>{document.removeEventListener('keydown',keydown);previous?.focus();};},[onClose,open]);return ref;}
export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) { const ref=useFocusTrap<HTMLDivElement>(open,onClose); if (!open) return null; return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 sm:items-center sm:p-4" onMouseDown={onClose}><div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-line bg-surface p-5 shadow-sheet sm:rounded-xl sm:p-6" onMouseDown={(e) => e.stopPropagation()}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="fi-display text-xl font-semibold">{title}</h2><IconButton label="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton></div>{children}</div></div>; }
export function Sheet({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) { const ref=useFocusTrap<HTMLElement>(open,onClose); if (!open) return null; return <div className="fixed inset-0 z-50 bg-ink/25" onMouseDown={onClose}><aside ref={ref} role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-line bg-surface p-5 shadow-sheet sm:p-6" onMouseDown={(e) => e.stopPropagation()}>{children}</aside></div>; }
export function Toast({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'error' }) { return <div role="status" className={cn('fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex items-center gap-2 rounded-lg border bg-surface px-4 py-3 text-sm shadow-sheet sm:left-auto sm:right-4 sm:max-w-sm md:bottom-6', tone === 'success' ? 'border-success/30' : 'border-critical/30')}>{tone === 'success' ? <Check className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-critical" />}{children}</div>; }
export function Skeleton({ className }: { className?: string }) { return <div aria-hidden="true" className={cn('animate-pulse rounded bg-surface-subtle', className)} />; }
export function Spinner({ className }: { className?: string }) { return <div className={cn('h-5 w-5 animate-spin rounded-full border-2 border-line border-t-ink', className)} role="status" aria-label="Loading" />; }
export function Panel({ className, children }: { className?: string; children: ReactNode }) { return <div className={cn('rounded-lg border border-line bg-surface', className)}>{children}</div>; }
export function InlineError({ children }: { children: ReactNode }) { return <p role="alert" className="flex items-center gap-1.5 text-xs text-critical"><AlertCircle className="h-3.5 w-3.5" />{children}</p>; }
export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-14 text-center sm:px-10 sm:py-16">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-canvas text-ink-muted">
        {icon}
      </div>
      <h2 className="fi-display text-2xl font-medium">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function FileDropPlaceholder() { return <div aria-disabled="true" className="rounded-lg border border-dashed border-line-strong bg-surface-subtle/50 px-4 py-5 text-center"><Upload className="mx-auto h-5 w-5 text-ink-muted" /><p className="mt-2 text-sm text-ink">Add a screenshot</p><p className="mt-1 text-xs text-ink-faint">Available in the next stage</p></div>; }
