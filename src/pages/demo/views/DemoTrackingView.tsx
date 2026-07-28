import { useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { Button, StatusBadge, Textarea } from '@/components/ui';
import {
  DEMO_ENVIRONMENT,
  DEMO_ISSUE,
  DEMO_REPORTS,
  DEMO_RESOLUTION_NOTE,
} from '@/pages/demo/demoData';

export function DemoTrackingView({
  resolved,
  confirmed,
  onConfirm,
  onNotFixed,
}: {
  resolved: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  onNotFixed: (explanation: string) => void;
}) {
  const [notFixedExplanation, setNotFixedExplanation] = useState('');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-7 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-6">
        <div>
          <p className="text-sm font-medium">Track your feedback</p>
          <p className="mt-1 text-xs text-ink-muted">
            Updates are securely provided through VensaOS.
          </p>
        </div>
        <p className="fi-mono text-[9px] uppercase tracking-wider text-ink-faint">Demo · read-only</p>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="fi-mono text-[10px] text-ink-faint">{DEMO_ISSUE.publicCode}</span>
          <StatusBadge
            status={resolved ? 'resolved' : 'testing'}
            label={resolved ? 'Resolved' : 'Testing'}
          />
        </div>
        <p className="mt-4 text-sm leading-6">
          {resolved
            ? DEMO_RESOLUTION_NOTE
            : 'Your feedback was received. The team is validating a fix for the mobile chat composer covering new messages.'}
        </p>
        <div className="mt-5 border-t border-line pt-4">
          <p className="fi-eyebrow">Public activity</p>
          <p className="mt-2 text-sm text-ink-muted">
            {resolved
              ? 'Owner published a resolution note · 35 min ago'
              : 'Your feedback was received · Yesterday'}
          </p>
        </div>
      </div>

      <h2 className="fi-display mt-8 text-2xl font-medium leading-tight sm:text-3xl">
        {DEMO_ISSUE.title}
      </h2>
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <Lock className="h-3.5 w-3.5" /> Only someone with this private link can view this report and
        its evidence.
      </p>

      <section className="mt-8">
        <p className="fi-eyebrow">Original report</p>
        <blockquote className="mt-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-6">
          {DEMO_REPORTS[0].body}
        </blockquote>
        <p className="fi-mono mt-2 text-[9px] text-ink-faint">BUG · Yesterday</p>
      </section>

      <section className="mt-8">
        <p className="fi-eyebrow">Environment</p>
        <div className="mt-3 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
          <EnvCell label="Browser" value={DEMO_ENVIRONMENT.browser} />
          <EnvCell label="Device" value={DEMO_ENVIRONMENT.device} />
          <EnvCell label="Screen" value={DEMO_ENVIRONMENT.screen} />
          <EnvCell label="Viewport" value={DEMO_ENVIRONMENT.viewport} />
          <div className="bg-surface p-3 sm:col-span-2">
            <p className="fi-mono text-[9px] uppercase text-ink-faint">Page</p>
            <p className="mt-1 text-xs text-ink-muted">{DEMO_ENVIRONMENT.page}</p>
          </div>
        </div>
      </section>

      {resolved && !confirmed ? (
        <section className="mt-8 rounded-lg border border-info/25 bg-info-soft/30 p-6">
          <h3 className="fi-display text-2xl font-medium">Did this fix the problem?</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Your answer closes the loop or reopens the issue for the team.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={onConfirm}>
              Fixed
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => document.getElementById('demo-not-fixed-explanation')?.focus()}
            >
              Not fixed
            </Button>
          </div>
          <label className="mt-5 block text-sm font-medium" htmlFor="demo-not-fixed-explanation">
            If it is not fixed, what happened?
          </label>
          <Textarea
            id="demo-not-fixed-explanation"
            className="mt-2"
            value={notFixedExplanation}
            onChange={(event) => setNotFixedExplanation(event.target.value)}
            placeholder="Tell the team what still fails."
          />
          <Button
            className="mt-3"
            type="button"
            variant="danger"
            disabled={!notFixedExplanation.trim()}
            onClick={() => onNotFixed(notFixedExplanation.trim())}
          >
            Reopen as not fixed
          </Button>
        </section>
      ) : null}

      {confirmed ? (
        <div className="mt-8 rounded-lg border border-success/25 bg-success-soft p-5 text-sm text-success">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Thanks — you confirmed this is fixed.
          </p>
        </div>
      ) : null}

      {!resolved ? (
        <Button type="button" className="mt-8" variant="secondary" onClick={() => onNotFixed('Still broken in demo')}>
          Jump to “Not fixed” reopen
        </Button>
      ) : null}
    </div>
  );
}

function EnvCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3">
      <p className="fi-mono text-[9px] uppercase text-ink-faint">{label}</p>
      <p className="mt-1 text-xs text-ink-muted">{value}</p>
    </div>
  );
}
