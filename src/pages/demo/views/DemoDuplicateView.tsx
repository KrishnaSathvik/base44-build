import { Button } from '@/components/ui';
import { DEMO_DUPLICATE, DEMO_ISSUE } from '@/pages/demo/demoData';

export function DemoDuplicateView({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 md:py-10">
      <p className="fi-eyebrow">Exceptions · Possible duplicate</p>
      <h2 className="fi-display mt-3 text-3xl font-medium">Owner review required</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
        Medium-confidence relationships stay as suggestions. Automatic grouping only happens when
        evidence is strong.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-ink bg-ink p-5 text-white">
          <p className="fi-mono text-[9px] text-white/55">{DEMO_ISSUE.publicCode}</p>
          <p className="mt-3 text-lg font-medium">{DEMO_ISSUE.title}</p>
          <p className="mt-4 text-xs text-white/70">
            Current grouped issue · {DEMO_ISSUE.reportCount} reports
          </p>
        </article>
        <article className="rounded-lg border border-line bg-surface p-5">
          <p className="fi-mono text-[9px] text-ink-faint">
            {DEMO_DUPLICATE.publicCode} · {DEMO_DUPLICATE.confidence}% confidence
          </p>
          <p className="mt-3 text-lg font-medium">{DEMO_DUPLICATE.title}</p>
          <p className="mt-4 text-xs leading-5 text-ink-muted">{DEMO_DUPLICATE.reason}</p>
        </article>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" disabled title="Disabled in demo">
          Merge as duplicate
        </Button>
        <Button type="button" variant="secondary" disabled title="Disabled in demo">
          Keep separate
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Back to Inbox
        </Button>
      </div>
    </div>
  );
}
