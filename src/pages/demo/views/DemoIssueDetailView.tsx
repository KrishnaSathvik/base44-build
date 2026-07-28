import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  MessageSquareText,
} from 'lucide-react';
import {
  Badge,
  Button,
  InlineError,
  Select,
  SeverityBadge,
  StatusBadge,
  Textarea,
  cn,
} from '@/components/ui';
import {
  DEMO_ACTIVITY,
  DEMO_ISSUE,
  DEMO_MESSAGES,
  DEMO_REPORTS,
  DEMO_RESOLUTION_NOTE,
} from '@/pages/demo/demoData';

export function DemoIssueDetailView({
  highlightPriority,
  resolved,
  notFixed,
  onBack,
  onResolve,
  onDuplicate,
  onReporter,
}: {
  highlightPriority?: boolean;
  resolved: boolean;
  notFixed: boolean;
  onBack: () => void;
  onResolve: (publicMessage: string) => void;
  onDuplicate: () => void;
  onReporter: () => void;
}) {
  const [targetStatus, setTargetStatus] = useState<'testing' | 'resolved'>('resolved');
  const [publicMessage, setPublicMessage] = useState(DEMO_RESOLUTION_NOTE);
  const [internalNote, setInternalNote] = useState('');
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const status = notFixed ? 'open' : resolved ? 'resolved' : DEMO_ISSUE.status;
  const statusLabel = notFixed ? 'Open' : resolved ? 'Resolved' : 'Testing';

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7 md:py-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All issues
      </button>

      <header className="border-b border-line pb-8 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="fi-mono text-[10px] text-ink-faint">{DEMO_ISSUE.publicCode}</span>
          <SeverityBadge severity={DEMO_ISSUE.severity} label="High" />
          <StatusBadge status={status} label={statusLabel} />
          {notFixed ? <Badge tone="warning">Reopened by reporter</Badge> : null}
        </div>
        <h2 className="fi-display mt-4 max-w-4xl text-[1.75rem] font-medium leading-tight sm:text-3xl md:text-[40px]">
          {DEMO_ISSUE.title}
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-ink-muted">
          {DEMO_ISSUE.description}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
          <Metric value={String(DEMO_ISSUE.reportCount)} label="Reports" />
          <Metric value={String(DEMO_ISSUE.affectedUserCount)} label="Affected" />
          <Metric value={String(DEMO_ISSUE.priorityScore)} label="Priority" />
          <Metric value="Today" label="Last seen" />
        </div>
      </header>

      <div className="space-y-10 py-8 sm:space-y-12 sm:py-10">
        <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <p className="fi-eyebrow">Workflow</p>
          <h3 className="fi-display mt-2 text-xl font-medium sm:text-2xl">Update this issue</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Actions are simulated in this demo and do not change live data.
          </p>

          {resolved && !notFixed ? (
            <div className="mt-5 rounded-lg border border-success/25 bg-success-soft p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Resolved
              </div>
              <p className="mt-3 text-sm leading-6">{DEMO_RESOLUTION_NOTE}</p>
              <p className="fi-mono mt-3 text-[9px] text-ink-faint">
                Just now · Awaiting confirmation
              </p>
              <Button type="button" variant="secondary" className="mt-4" onClick={onReporter}>
                See the reporter’s view
              </Button>
            </div>
          ) : (
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setWorkflowError(null);
                if (targetStatus === 'resolved' && !publicMessage.trim()) {
                  setWorkflowError(
                    'Add a public message explaining what changed for the reporter.',
                  );
                  return;
                }
                if (targetStatus === 'resolved') onResolve(publicMessage.trim());
              }}
            >
              <label htmlFor="demo-issue-status" className="text-sm font-medium">
                Status transition
              </label>
              <Select
                id="demo-issue-status"
                value={targetStatus}
                onChange={(event) =>
                  setTargetStatus(event.target.value as 'testing' | 'resolved')
                }
              >
                <option value="testing">Testing — current</option>
                <option value="resolved">Resolved</option>
              </Select>
              <p className="text-xs leading-5 text-ink-muted">
                {targetStatus === 'resolved'
                  ? 'To resolve, write a public message the reporter can read. No private owner reason is required.'
                  : 'Only approved next steps for the current status are listed.'}
              </p>
              <div>
                <label htmlFor="demo-public-message" className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquareText className="h-4 w-4" />
                  Public message
                </label>
                <p className="mt-1 text-xs text-ink-muted">
                  Shown to the reporter on their tracking page.
                </p>
                <Textarea
                  id="demo-public-message"
                  className="mt-2"
                  value={publicMessage}
                  onChange={(event) => setPublicMessage(event.target.value)}
                  placeholder="Explain what changed…"
                />
              </div>
              <div>
                <label htmlFor="demo-internal-note" className="flex items-center gap-2 text-sm font-medium">
                  <LockKeyhole className="h-4 w-4" />
                  Internal note (optional)
                </label>
                <p className="mt-1 text-xs text-ink-muted">
                  Private team note — never shown to reporters.
                </p>
                <Textarea
                  id="demo-internal-note"
                  className="mt-2 min-h-20"
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  placeholder="Visible only to the product team…"
                />
              </div>
              {workflowError ? <InlineError>{workflowError}</InlineError> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Resolve issue</Button>
                <Button type="button" variant="secondary" onClick={onDuplicate}>
                  Review possible duplicate
                </Button>
                <Button type="button" variant="ghost" onClick={onReporter}>
                  See the reporter’s view
                </Button>
              </div>
            </form>
          )}
        </section>

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
                <p className="fi-mono text-[10px] text-ink-faint">
                  {report.type} · {report.grouping} · {report.similarity}%
                </p>
                <blockquote className="mt-3 border-l-2 border-critical pl-4 text-base leading-7">
                  {report.body}
                </blockquote>
                <p className="mt-3 text-xs text-ink-muted">Expected: {report.expected}</p>
                <p className="fi-mono mt-2 text-[9px] text-ink-faint">
                  {report.device} · Screenshot attached
                </p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
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

          <aside className="space-y-8">
            <section className={cn(highlightPriority && 'rounded-lg border border-ink p-4')}>
              <h3 className="fi-display text-xl font-medium">Why this priority</h3>
              <p className="mt-2 text-sm text-ink-muted">
                Deterministic score: {DEMO_ISSUE.priorityScore}
              </p>
              <ul className="mt-4 space-y-2 text-xs text-ink-muted">
                {DEMO_ISSUE.priorityReasons.map((reason) => (
                  <li key={reason} className="border-b border-line pb-2">
                    {reason}
                  </li>
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
          </aside>
        </div>
      </div>
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
