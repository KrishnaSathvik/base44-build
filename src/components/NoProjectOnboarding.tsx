import { Link } from 'react-router-dom';
import { ArrowRight, Link2, Inbox, SquareKanban } from 'lucide-react';
import { Button } from '@/components/ui';

const STEPS = [
  { icon: Link2, label: 'Share one public link', detail: 'Reporters submit without creating an account.' },
  { icon: Inbox, label: 'Reports land in Inbox', detail: 'Related feedback is grouped with the original evidence kept.' },
  { icon: SquareKanban, label: 'Prioritize what to fix', detail: 'Issues are ordered by impact so the next action is clear.' },
] as const;

/** Shared empty-workspace composition when the owner has no feedback board yet. */
export function NoProjectOnboarding({
  eyebrow = 'Get started',
  title = 'Create your first feedback board',
  description = 'Set up a public link, collect a test report, and watch it become a prioritized issue in your workspace.',
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <div className="border-b border-line pb-8">
        <p className="fi-eyebrow">{eyebrow}</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="fi-display text-3xl font-medium leading-tight sm:text-4xl md:text-[42px]">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-ink-muted">{description}</p>
          </div>
          <Link to="/app/setup" className="shrink-0">
            <Button className="w-full sm:w-auto">
              Create your first feedback board
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-0 border-b border-line lg:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.label}
              className="border-b border-line px-1 py-7 last:border-b-0 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-1 lg:last:border-r-0 lg:last:pr-1"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink-muted">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Step {index + 1}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-ink">{step.label}</p>
              <p className="mt-2 text-xs leading-5 text-ink-muted">{step.detail}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        After setup, Overview, Inbox, and Issues fill with live project evidence from one public link.
      </p>
    </div>
  );
}
