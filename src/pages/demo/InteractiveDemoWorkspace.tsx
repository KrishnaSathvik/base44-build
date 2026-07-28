import { useEffect, useState } from 'react';
import { Button, cn } from '@/components/ui';
import { DemoAppShell } from '@/pages/demo/DemoAppShell';
import { DEMO_STEPS, type DemoView } from '@/pages/demo/demoData';
import { DemoDuplicateView } from '@/pages/demo/views/DemoDuplicateView';
import { DemoInboxView } from '@/pages/demo/views/DemoInboxView';
import { DemoIssueDetailView } from '@/pages/demo/views/DemoIssueDetailView';
import { DemoIssuesView } from '@/pages/demo/views/DemoIssuesView';
import { DemoOverviewView } from '@/pages/demo/views/DemoOverviewView';
import { DemoResolvedView } from '@/pages/demo/views/DemoResolvedView';
import { DemoTrackingView } from '@/pages/demo/views/DemoTrackingView';

export function InteractiveDemoWorkspace() {
  const [view, setView] = useState<DemoView>('overview');
  const [step, setStep] = useState(1);
  const [resolved, setResolved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notFixed, setNotFixed] = useState(false);
  const [highlightPriority, setHighlightPriority] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function go(next: DemoView, nextStep?: number, options?: { highlightPriority?: boolean }) {
    setView(next);
    if (nextStep) setStep(nextStep);
    setHighlightPriority(Boolean(options?.highlightPriority));
  }

  function simulateResolve() {
    setResolved(true);
    setNotFixed(false);
    setConfirmed(false);
    setView('tracking');
    setStep(5);
    setToast('Resolution published to the reporter tracking page (demo only).');
  }

  function simulateNotFixed() {
    setNotFixed(true);
    setResolved(false);
    setConfirmed(false);
    setView('detail');
    setStep(4);
    setToast('Reporter selected “Not fixed”. Issue reopened for owner review (demo only).');
  }

  function simulateConfirm() {
    setConfirmed(true);
    setToast('Reporter confirmed the fix (demo only).');
  }

  const activeStep = DEMO_STEPS.find((item) => item.id === step) ?? DEMO_STEPS[0];

  const jumpActions = [
    { label: 'Open the grouped issue', run: () => go('detail', 4) },
    { label: 'Review the possible duplicate', run: () => go('inbox', 2) },
    { label: 'See the reporter’s view', run: () => go('tracking', 5) },
    {
      label: 'See why this priority is high',
      run: () => go('detail', 4, { highlightPriority: true }),
    },
    { label: 'See how “Not fixed” reopens it', run: simulateNotFixed },
  ] as const;

  function navigateShell(next: DemoView) {
    switch (next) {
      case 'overview':
        go('overview', 1);
        break;
      case 'inbox':
        go('inbox', 2);
        break;
      case 'issues':
        go('issues', 3);
        break;
      case 'resolved':
        go('resolved', resolved || notFixed ? 5 : 3);
        break;
      case 'detail':
      case 'duplicate':
      case 'tracking':
        go(next);
        break;
      default: {
        const _exhaustive: never = next;
        return _exhaustive;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <p className="fi-eyebrow">Guided walkthrough</p>

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
                  step === item.id
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-canvas text-ink-muted',
                )}
              >
                {item.id}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium leading-5 text-ink">{activeStep.label}</p>
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
                    step === item.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-canvas text-ink-muted hover:border-line-strong hover:text-ink',
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

      <DemoAppShell
        view={view}
        toast={toast}
        hideMobileNav={view === 'detail'}
        onNavigate={navigateShell}
      >
        {view === 'overview' ? (
          <DemoOverviewView
            walkthroughResolved={resolved && !notFixed}
            onOpenIssues={() => go('issues', 3)}
            onOpenIssue={() => go('detail', 4)}
          />
        ) : null}
        {view === 'inbox' ? (
          <DemoInboxView
            onOpenIssue={() => go('detail', 4)}
            onReviewDuplicate={() => go('duplicate', 2)}
          />
        ) : null}
        {view === 'issues' ? (
          <DemoIssuesView
            walkthroughResolved={resolved && !notFixed}
            notFixed={notFixed}
            onOpenIssue={() => go('detail', 4)}
          />
        ) : null}
        {view === 'detail' ? (
          <DemoIssueDetailView
            highlightPriority={highlightPriority}
            resolved={resolved}
            notFixed={notFixed}
            onBack={() => go('issues', 3)}
            onResolve={() => simulateResolve()}
            onDuplicate={() => go('duplicate', 2)}
            onReporter={() => go('tracking', 5)}
          />
        ) : null}
        {view === 'duplicate' ? <DemoDuplicateView onBack={() => go('inbox', 2)} /> : null}
        {view === 'resolved' ? (
          <DemoResolvedView
            walkthroughResolved={resolved}
            confirmed={confirmed}
            notFixed={notFixed}
            onOpenWalkthrough={() => go('detail', 4)}
          />
        ) : null}
        {view === 'tracking' ? (
          <DemoTrackingView
            resolved={resolved && !notFixed}
            confirmed={confirmed}
            onConfirm={simulateConfirm}
            onNotFixed={() => simulateNotFixed()}
          />
        ) : null}
      </DemoAppShell>
    </div>
  );
}
