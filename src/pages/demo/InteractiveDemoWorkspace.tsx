import { useEffect, useState } from 'react';
import {
  Archive,
  Inbox,
  LayoutGrid,
  SquareKanban,
} from 'lucide-react';
import { Badge, Button, SeverityBadge, StatusBadge, cn } from '@/components/ui';
import {
  DEMO_ACTIVITY,
  DEMO_DUPLICATE,
  DEMO_ISSUE,
  DEMO_MESSAGES,
  DEMO_REPORTS,
  DEMO_STEPS,
  type DemoView,
} from '@/pages/demo/demoData';

const NAV = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutGrid },
  { id: 'inbox' as const, label: 'Inbox', icon: Inbox },
  { id: 'issue' as const, label: 'Issues', icon: SquareKanban },
  { id: 'reporter' as const, label: 'Resolved', icon: Archive },
];

export function InteractiveDemoWorkspace() {
  const [view, setView] = useState<DemoView>('inbox');
  const [step, setStep] = useState(1);
  const [resolved, setResolved] = useState(false);
  const [notFixed, setNotFixed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function go(next: DemoView, nextStep?: number) {
    setView(next);
    if (nextStep) setStep(nextStep);
  }

  function simulateResolve() {
    setResolved(true);
    setNotFixed(false);
    setView('reporter');
    setStep(5);
    setToast('Resolution published to the reporter tracking page (demo only).');
  }

  function simulateNotFixed() {
    setNotFixed(true);
    setResolved(false);
    setView('issue');
    setStep(4);
    setToast('Reporter selected “Not fixed”. Issue reopened for owner review (demo only).');
  }

  const activeStep = DEMO_STEPS.find((item) => item.id === step) ?? DEMO_STEPS[0];
  const stepIndex = DEMO_STEPS.findIndex((item) => item.id === step);
  const previousStep = stepIndex > 0 ? DEMO_STEPS[stepIndex - 1] : null;
  const nextStep = stepIndex < DEMO_STEPS.length - 1 ? DEMO_STEPS[stepIndex + 1] : null;

  const jumpActions = [
    { label: 'Open the grouped issue', run: () => go('issue', 2) },
    { label: 'Review the possible duplicate', run: () => go('duplicate', 3) },
    { label: 'See the reporter’s view', run: () => go('reporter', 5) },
    { label: 'See why this priority is high', run: () => go('priority', 4) },
    { label: 'See how “Not fixed” reopens it', run: simulateNotFixed },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <p className="fi-eyebrow">Guided walkthrough</p>

        {/* Mobile: compact stepper */}
        <div className="mt-4 md:hidden">
          <div className="flex items-center justify-between gap-2" role="tablist" aria-label="Demo steps">
            {DEMO_STEPS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={step === item.id}
                data-demo-step={item.id}
                onClick={() => go(item.view, item.id)}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition',
                  step === item.id ? 'border-ink bg-ink text-white' : 'border-line bg-canvas text-ink-muted',
                )}
              >
                {item.id}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium leading-5 text-ink">{activeStep.label}</p>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={!previousStep}
              onClick={() => previousStep && go(previousStep.view, previousStep.id)}
            >
              Previous
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!nextStep}
              onClick={() => nextStep && go(nextStep.view, nextStep.id)}
            >
              Next
            </Button>
          </div>
          <label className="mt-4 block">
            <span className="fi-mono text-[10px] uppercase tracking-wider text-ink-faint">Jump to</span>
            <select
              className="mt-2 w-full min-h-11 rounded-md border border-line bg-canvas px-3 text-sm text-ink"
              defaultValue=""
              onChange={(event) => {
                const index = Number(event.target.value);
                if (!Number.isFinite(index) || !jumpActions[index]) return;
                jumpActions[index].run();
                event.currentTarget.value = '';
              }}
            >
              <option value="" disabled>
                Choose a moment in the demo…
              </option>
              {jumpActions.map((action, index) => (
                <option key={action.label} value={index}>
                  {action.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Tablet / desktop: full step cards + action buttons */}
        <div className="mt-4 hidden space-y-4 md:block">
          <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            {DEMO_STEPS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  data-demo-step={item.id}
                  onClick={() => go(item.view, item.id)}
                  aria-current={step === item.id ? 'step' : undefined}
                  className={cn(
                    'flex h-full min-h-[4.5rem] w-full flex-col rounded-md border px-3 py-3 text-left transition',
                    step === item.id ? 'border-ink bg-ink text-white' : 'border-line bg-canvas text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  <span className="fi-mono text-[10px] opacity-70">{item.id}</span>
                  <span className="mt-1 block text-xs leading-4">{item.label}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-1 gap-2 border-t border-line pt-4 sm:grid-cols-2 xl:flex xl:flex-wrap">
            {jumpActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="secondary"
                className="w-full justify-start xl:w-auto"
                onClick={action.run}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-canvas shadow-sheet">
        <div className="flex min-h-14 flex-col justify-center gap-1 border-b border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
          <div>
            <p className="text-sm font-medium">VensaOS workspace</p>
            <p className="fi-mono text-[9px] uppercase tracking-wider text-ink-faint">TrailVerse Demo · read-only</p>
          </div>
          {toast ? <p role="status" className="max-w-full text-xs text-ink-muted sm:max-w-sm sm:text-right">{toast}</p> : null}
        </div>
        <div className="grid lg:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="hidden border-r border-line bg-surface p-3 lg:block">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active =
                (id === 'issue' && (view === 'issue' || view === 'duplicate' || view === 'priority')) ||
                (id === 'overview' && view === 'overview') ||
                (id === 'inbox' && view === 'inbox') ||
                (id === 'reporter' && (view === 'reporter' || view === 'reopen'));
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id === 'reporter' ? 'reporter' : id, id === 'inbox' ? 1 : id === 'issue' ? 2 : id === 'reporter' ? 5 : undefined)}
                  className={cn(
                    'mb-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors',
                    active ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" />
                  {label}
                </button>
              );
            })}
          </aside>

          <div className="min-h-[640px]">
            <div className="flex gap-2 overflow-x-auto border-b border-line p-3 lg:hidden">
              {NAV.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id === 'reporter' ? 'reporter' : id)}
                  className={cn('min-h-10 shrink-0 rounded-md px-3 text-xs', view === id || (id === 'issue' && ['issue', 'duplicate', 'priority'].includes(view)) ? 'bg-ink text-white' : 'text-ink-muted')}
                >
                  {label}
                </button>
              ))}
            </div>
            {view === 'overview' ? <OverviewPane onOpenIssue={() => go('issue', 2)} /> : null}
            {view === 'inbox' ? <InboxPane onOpenIssue={() => go('issue', 2)} /> : null}
            {view === 'issue' || view === 'priority' ? (
              <IssuePane
                highlightPriority={view === 'priority'}
                resolved={resolved}
                notFixed={notFixed}
                onResolve={simulateResolve}
                onDuplicate={() => go('duplicate', 3)}
                onReporter={() => go('reporter', 5)}
              />
            ) : null}
            {view === 'duplicate' ? <DuplicatePane onBack={() => go('issue', 3)} /> : null}
            {view === 'reporter' || view === 'reopen' ? (
              <ReporterPane resolved={resolved && !notFixed} onNotFixed={simulateNotFixed} onConfirm={() => setToast('Reporter confirmed the fix (demo only).')} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewPane({ onOpenIssue }: { onOpenIssue: () => void }) {
  return (
    <div className="p-6 sm:p-8">
      <p className="fi-eyebrow">Friday briefing</p>
      <h2 className="fi-display mt-3 text-3xl font-medium">1 issue needs attention.</h2>
      <p className="mt-2 text-sm text-ink-muted">Highest-impact work in TrailVerse Demo.</p>
      <button type="button" onClick={onOpenIssue} className="mt-8 block w-full border-t border-line py-5 text-left hover:bg-surface/60 sm:px-2">
        <div className="flex items-center gap-3">
          <span className="fi-mono text-[10px] text-ink-faint">{DEMO_ISSUE.publicCode}</span>
          <SeverityBadge severity={DEMO_ISSUE.severity} label="High" />
        </div>
        <p className="mt-2 text-[15px] font-medium">{DEMO_ISSUE.title}</p>
        <p className="fi-mono mt-2 text-[9px] uppercase text-ink-faint">{DEMO_ISSUE.reportCount} reports · priority {DEMO_ISSUE.priorityScore}</p>
      </button>
    </div>
  );
}

function InboxPane({ onOpenIssue }: { onOpenIssue: () => void }) {
  return (
    <div className="grid min-h-[640px] lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="border-b border-line lg:border-b-0 lg:border-r">
        <p className="border-b border-line px-4 py-3 fi-eyebrow">Incoming reports</p>
        {DEMO_REPORTS.map((report, index) => (
          <button
            key={report.id}
            type="button"
            onClick={onOpenIssue}
            className={cn('block w-full border-b border-line px-4 py-4 text-left', index === 0 ? 'bg-canvas' : 'hover:bg-surface')}
          >
            <p className="fi-mono text-[9px] text-ink-faint">{report.type} · {report.grouping}</p>
            <p className="mt-2 text-sm leading-5">{report.body}</p>
          </button>
        ))}
      </div>
      <div className="p-6">
        <p className="fi-eyebrow">Selected report</p>
        <blockquote className="mt-4 border-l-2 border-critical pl-4 text-lg leading-7">{DEMO_REPORTS[0].body}</blockquote>
        <div className="mt-6 rounded-lg bg-surface-subtle p-4">
          <p className="fi-eyebrow">How VensaOS understood this</p>
          <ul className="mt-3 space-y-1 text-xs leading-5 text-ink-muted">
            {DEMO_ISSUE.understanding.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
        <Button type="button" className="mt-6" onClick={onOpenIssue}>Open the grouped issue</Button>
      </div>
    </div>
  );
}

function IssuePane({
  highlightPriority,
  resolved,
  notFixed,
  onResolve,
  onDuplicate,
  onReporter,
}: {
  highlightPriority: boolean;
  resolved: boolean;
  notFixed: boolean;
  onResolve: () => void;
  onDuplicate: () => void;
  onReporter: () => void;
}) {
  const status = notFixed ? 'open' : resolved ? 'resolved' : DEMO_ISSUE.status;
  const statusLabel = notFixed ? 'Open' : resolved ? 'Resolved' : 'Testing';
  return (
    <div className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className="fi-mono text-[10px] text-ink-faint">{DEMO_ISSUE.publicCode}</span>
        <SeverityBadge severity={DEMO_ISSUE.severity} label="High" />
        <StatusBadge status={status} label={statusLabel} />
        {notFixed ? <Badge tone="warning">Reopened by reporter</Badge> : null}
      </div>
      <h2 className="fi-display mt-4 text-2xl font-medium leading-tight sm:text-3xl">{DEMO_ISSUE.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">{DEMO_ISSUE.description}</p>
      <div className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-4 sm:grid-cols-4">
        <Metric value={String(DEMO_ISSUE.reportCount)} label="Reports" />
        <Metric value={String(DEMO_ISSUE.affectedUserCount)} label="Affected" />
        <Metric value={String(DEMO_ISSUE.priorityScore)} label="Priority" />
        <Metric value="Today" label="Last seen" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-8">
          <section>
            <p className="fi-eyebrow">Understanding</p>
            <h3 className="fi-display mt-2 text-xl font-medium">How VensaOS understood this</h3>
            <div className="mt-4 grid gap-px bg-line sm:grid-cols-2">
              <Fact label="Category" value={DEMO_ISSUE.category} />
              <Fact label="Product area" value={DEMO_ISSUE.productArea} />
              <Fact label="Reproducibility" value={DEMO_ISSUE.reproducibility} />
              <Fact label="Core workflow" value={DEMO_ISSUE.coreWorkflow} />
              <Fact label="Analysis method" value={DEMO_ISSUE.analysisMethod} />
              <Fact label="Confidence" value={DEMO_ISSUE.confidence} />
            </div>
          </section>

          <section>
            <p className="fi-eyebrow">Source evidence</p>
            <h3 className="fi-display mt-2 text-xl font-medium">3 user reports</h3>
            <div className="mt-4 border-t border-line">
              {DEMO_REPORTS.map((report) => (
                <article key={report.id} className="border-b border-line py-5">
                  <p className="fi-mono text-[10px] text-ink-faint">{report.type} · {report.grouping} · {report.similarity}%</p>
                  <blockquote className="mt-3 border-l-2 border-critical pl-4 text-base leading-7">{report.body}</blockquote>
                  <p className="mt-3 text-xs text-ink-muted">Expected: {report.expected}</p>
                  <p className="fi-mono mt-2 text-[9px] text-ink-faint">{report.device} · Screenshot attached</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <p className="fi-eyebrow">Reporter conversation</p>
            <h3 className="fi-display mt-2 text-xl font-medium">Public updates</h3>
            <div className="mt-4 space-y-3">
              {DEMO_MESSAGES.map((message) => (
                <article key={message.body} className="rounded-lg border border-line bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <Badge tone={message.from === 'reporter' ? 'info' : 'neutral'}>
                      {message.from === 'reporter' ? 'Reporter message' : 'Public message'}
                    </Badge>
                    <span className="fi-mono ml-auto text-[9px] text-ink-faint">{message.time}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6">{message.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <section className={cn(highlightPriority && 'rounded-lg border border-ink p-4')}>
            <h3 className="fi-display text-xl font-medium">Why this priority</h3>
            <p className="mt-2 text-sm text-ink-muted">Deterministic score: {DEMO_ISSUE.priorityScore}</p>
            <ul className="mt-4 space-y-2 text-xs text-ink-muted">
              {DEMO_ISSUE.priorityReasons.map((reason) => (
                <li key={reason} className="border-b border-line pb-2">{reason}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="fi-display text-xl font-medium">Activity</h3>
            <div className="mt-4 border-l border-line pl-5">
              {DEMO_ACTIVITY.map((event) => (
                <div key={event.body} className="relative pb-5 last:pb-0">
                  <span className="absolute -left-[27px] top-1 h-2 w-2 rounded-full bg-ink-muted" />
                  <p className="text-sm leading-6">{event.body}</p>
                  <p className="fi-mono mt-1 text-[9px] text-ink-faint">{event.time}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="border-t border-line pt-6">
            <h3 className="fi-display text-xl font-medium">Workflow</h3>
            <p className="mt-2 text-xs text-ink-muted">Actions are simulated in this demo and do not change live data.</p>
            <div className="mt-4 space-y-2">
              <Button type="button" className="w-full" onClick={onResolve} disabled={resolved && !notFixed}>
                {resolved && !notFixed ? 'Resolved (demo)' : 'Resolve with public note'}
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={onDuplicate}>
                Review possible duplicate
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={onReporter}>
                See the reporter’s view
              </Button>
              <Button type="button" variant="ghost" className="w-full" disabled title="Disabled in demo">
                Request more information
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DuplicatePane({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-6 sm:p-8">
      <p className="fi-eyebrow">Possible duplicate</p>
      <h2 className="fi-display mt-3 text-3xl font-medium">Owner review required</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
        Medium-confidence relationships stay as suggestions. Automatic grouping only happens when evidence is strong.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-ink bg-ink p-5 text-white">
          <p className="fi-mono text-[9px] text-white/55">{DEMO_ISSUE.publicCode}</p>
          <p className="mt-3 text-lg font-medium">{DEMO_ISSUE.title}</p>
          <p className="mt-4 text-xs text-white/70">Current grouped issue · {DEMO_ISSUE.reportCount} reports</p>
        </article>
        <article className="rounded-lg border border-line bg-surface p-5">
          <p className="fi-mono text-[9px] text-ink-faint">{DEMO_DUPLICATE.publicCode} · {DEMO_DUPLICATE.confidence}% confidence</p>
          <p className="mt-3 text-lg font-medium">{DEMO_DUPLICATE.title}</p>
          <p className="mt-4 text-xs leading-5 text-ink-muted">{DEMO_DUPLICATE.reason}</p>
        </article>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" disabled title="Disabled in demo">Merge as duplicate</Button>
        <Button type="button" variant="secondary" disabled title="Disabled in demo">Keep separate</Button>
        <Button type="button" variant="ghost" onClick={onBack}>Back to grouped issue</Button>
      </div>
    </div>
  );
}

function ReporterPane({
  resolved,
  onNotFixed,
  onConfirm,
}: {
  resolved: boolean;
  onNotFixed: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg p-6 sm:p-10">
      <p className="fi-eyebrow">Reporter tracking</p>
      <h2 className="fi-display mt-3 text-3xl font-medium">
        {resolved ? 'We believe this is fixed' : 'Your report is being investigated'}
      </h2>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Private tracking page for the report linked to {DEMO_ISSUE.publicCode}. This demo view mirrors what reporters see after an owner update.
      </p>
      <div className="mt-8 rounded-xl border border-line bg-surface p-5">
        <StatusBadge status={resolved ? 'resolved' : 'testing'} label={resolved ? 'Resolved' : 'Testing'} />
        <p className="mt-4 text-sm leading-6">
          {resolved
            ? 'We raised the composer above the keyboard safe area so new messages stay visible.'
            : 'The team is validating a fix for the mobile chat composer covering new messages.'}
        </p>
      </div>
      {resolved ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium">Did this fix the problem?</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onConfirm}>Yes, it’s fixed</Button>
            <Button type="button" variant="secondary" onClick={onNotFixed}>Not fixed</Button>
          </div>
        </div>
      ) : (
        <Button type="button" className="mt-6" variant="secondary" onClick={onNotFixed}>
          Jump to “Not fixed” reopen
        </Button>
      )}
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="fi-display text-xl font-medium">{value}</p>
      <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">{label}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-subtle p-3">
      <p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p>
      <p className="mt-1 text-xs text-ink-muted">{value}</p>
    </div>
  );
}
