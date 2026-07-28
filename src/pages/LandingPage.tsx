import { Link } from 'react-router-dom';
import { ArrowRight, Check, ScanSearch } from 'lucide-react';
import { Brand, BrandMark } from '@/components/Brand';
import { ConvergenceVisual } from '@/components/ConvergenceVisual';

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      <header className="border-b border-line">
        <div className="fi-container flex h-16 items-center">
          <Brand />
        </div>
      </header>
      <main>
        <section className="fi-container grid items-center gap-10 py-12 sm:min-h-[700px] sm:gap-12 sm:py-20 lg:grid-cols-[1.04fr_.96fr] lg:py-24">
          <div className="max-w-3xl min-w-0">
            <p className="fi-eyebrow">Feedback intelligence for product teams</p>
            <h1 className="fi-display mt-5 text-[clamp(2.35rem,9vw,5.2rem)] font-semibold leading-[.98] tracking-[-.065em] sm:leading-[.94]">
              Feedback should tell you
              <br className="hidden sm:block" /> what to fix next.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink-muted sm:mt-7 sm:text-[17px]">
              Share one feedback link. VensaOS analyzes incoming reports, connects repeated problems, preserves the original evidence, and shows your team what deserves attention next.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/app" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-medium text-white sm:w-auto">
                Open workspace <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/demo" className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-line-strong bg-surface px-5 text-sm font-medium text-ink sm:w-auto">
                Explore live demo
              </Link>
            </div>
            <p className="fi-mono mt-5 text-[10px] uppercase tracking-[.1em] text-ink-faint">AI-assisted · Evidence-backed · Human-controlled</p>
          </div>
          <ConvergenceVisual />
        </section>

        <section className="border-y border-line bg-surface">
          <div className="fi-container py-16">
            <p className="fi-eyebrow">Owner workspace</p>
            <h2 className="fi-display mt-4 max-w-2xl text-3xl font-medium leading-tight sm:text-4xl">See what your team receives</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-ink-muted">
              Inbox on the left, grouped issue in the center, AI understanding, priority explanation, source evidence, and reporter activity—together in one working surface.
            </p>
            <WorkspacePreview />
          </div>
        </section>

        <section className="border-b border-line bg-surface">
          <div className="fi-container">
            <div className="border-b border-line py-12">
              <p className="fi-eyebrow">The product loop</p>
              <h2 className="fi-display mt-4 text-3xl font-medium leading-tight">Raw language becomes a clear issue—without losing the source.</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-6">
              {[
                ['01', 'Collect', 'Share one focused link.'],
                ['02', 'Understand', 'Keep the original evidence readable.'],
                ['03', 'Group', 'Connect repeated signals.'],
                ['04', 'Prioritize', 'See what affects users most.'],
                ['05', 'Resolve', 'Record what changed.'],
                ['06', 'Close the loop', 'Update the people who reported it.'],
              ].map(([n, t, d]) => (
                <div key={n} className="border-b border-line p-6 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0">
                  <span className="fi-mono text-[11px] text-ink-faint">{n}</span>
                  <h3 className="fi-display mt-8 text-xl font-medium">{t}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="fi-container py-16 sm:py-24">
          <div className="grid items-start gap-10 sm:gap-12 lg:grid-cols-2">
            <div className="min-w-0 lg:sticky lg:top-12">
              <p className="fi-eyebrow">Evidence first</p>
              <h2 className="fi-display mt-4 max-w-lg text-3xl font-medium leading-[1.05] sm:text-4xl">The answer stays connected to the words that led there.</h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-ink-muted">
                Normalized issues are useful only when the original evidence remains readable. Every finding keeps its source report, environment, and activity close at hand.
              </p>
            </div>
            <div className="border-y border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div>
                  <p className="fi-mono text-[10px] text-ink-faint">FI-7K2M9A</p>
                  <p className="mt-1 font-medium">Coupon action freezes checkout</p>
                </div>
                <span className="fi-mono rounded bg-warning-soft px-2 py-1 text-[10px] text-warning">HIGH</span>
              </div>
              <div className="p-6">
                <p className="fi-eyebrow">Original evidence</p>
                <blockquote className="mt-4 border-l-2 border-critical pl-4 text-lg leading-7">
                  “Apply code does nothing in Safari. I had to restart checkout.”
                </blockquote>
                <div className="mt-8 grid grid-cols-3 gap-2 border-y border-line py-4">
                  <Metric value="3" label="Reports" />
                  <Metric value="3" label="Affected" />
                  <Metric value="Today" label="Last seen" />
                </div>
                <div className="mt-6 flex items-center gap-3 text-sm text-ink-muted">
                  <ScanSearch className="h-4 w-4" /> Source evidence remains attached to the issue.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface-subtle">
          <div className="fi-container grid items-center gap-10 py-16 sm:gap-16 sm:py-24 lg:grid-cols-[1fr_.9fr]">
            <div className="max-w-lg min-w-0">
              <p className="fi-eyebrow">Simple on purpose</p>
              <h2 className="fi-display mt-4 text-3xl font-medium leading-tight sm:text-4xl">A feedback form people will actually finish.</h2>
              <p className="mt-5 text-[15px] leading-7 text-ink-muted">
                Reporters choose what they want to share, answer only relevant questions, and receive a private link to follow the result.
              </p>
              <ul className="mt-7 space-y-3 text-sm">
                {['No account required', 'Clear, progressive questions', 'Private status tracking'].map((x) => (
                  <li key={x} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white">
                      <Check className="h-3 w-3" />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mx-auto w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-sheet">
              <div className="flex items-center gap-3 border-b border-line pb-5">
                <BrandMark className="h-9 w-9" />
                <div>
                  <p className="font-medium">Share feedback</p>
                  <p className="text-xs text-ink-faint">Usually less than a minute</p>
                </div>
              </div>
              <div className="mt-5 space-y-4" aria-hidden="true">
                <div>
                  <p className="text-xs text-ink-faint">Feedback type</p>
                  <div className="mt-1.5 flex min-h-11 items-center rounded-md border border-line px-3.5 text-sm">
                    Report a problem
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Describe the problem</p>
                  <div className="mt-1.5 min-h-[88px] rounded-md border border-line px-3.5 py-3 text-sm text-ink-muted">
                    Tell us what you were doing and where things went wrong…
                  </div>
                </div>
                <div className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white">
                  Send feedback <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fi-container py-16 text-center sm:py-24">
          <BrandMark className="mx-auto h-11 w-11" />
          <h2 className="fi-display mx-auto mt-6 max-w-2xl text-3xl font-medium leading-tight sm:text-4xl">
            Turn the next report into something your team can act on.
          </h2>
          <Link to="/app" className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-medium text-white sm:w-auto">
            Open workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="fi-container flex flex-col gap-4 py-7 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p>Built for clear product decisions.</p>
        </div>
      </footer>
    </div>
  );
}

function WorkspacePreview() {
  return (
    <div className="mt-10 overflow-hidden rounded-xl border border-line bg-canvas shadow-sheet" aria-hidden="true">
      <div className="flex h-11 items-center border-b border-line bg-surface px-4">
        <span className="fi-mono text-[10px] text-ink-faint">VensaOS workspace · TrailVerse</span>
      </div>
      <div className="grid lg:grid-cols-[200px_240px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-surface p-3 lg:block">
          {['Overview', 'Inbox', 'Issues', 'Resolved'].map((label, index) => (
            <div
              key={label}
              className={`mb-1 rounded-md px-3 py-2.5 text-sm ${index === 2 ? 'bg-ink text-white' : 'text-ink-muted'}`}
            >
              {label}
            </div>
          ))}
        </aside>
        <div className="hidden border-r border-line bg-surface sm:block">
          <p className="border-b border-line px-4 py-3 fi-eyebrow">Inbox</p>
          {[
            ['BUG', 'Composer covers newest message'],
            ['BUG', 'Keyboard scrolls above reply'],
            ['BUG', 'Bubble hidden behind composer'],
          ].map(([type, title], index) => (
            <div key={title} className={`border-b border-line px-4 py-3 ${index === 0 ? 'bg-canvas' : ''}`}>
              <p className="fi-mono text-[9px] text-ink-faint">{type} · GROUPED</p>
              <p className="mt-1 text-xs leading-5">{title}</p>
            </div>
          ))}
        </div>
        <div className="min-w-0 bg-canvas p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="fi-mono text-[10px] text-ink-faint">FI-DEMO01</span>
            <span className="fi-mono rounded bg-warning-soft px-2 py-0.5 text-[9px] text-warning">HIGH</span>
            <span className="fi-mono rounded bg-info-soft px-2 py-0.5 text-[9px] text-info">TESTING</span>
          </div>
          <h3 className="fi-display mt-3 text-2xl font-medium leading-tight">Mobile chat composer obscures new messages</h3>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-4">
              <p className="fi-eyebrow">How VensaOS understood this</p>
              <ul className="mt-3 space-y-1 text-xs leading-5 text-ink-muted">
                <li>Category: UI UX · Product area: Mobile chat</li>
                <li>Reproducibility: confirmed · Core workflow: blocked</li>
                <li>3 related reports connected automatically</li>
              </ul>
            </div>
            <div className="rounded-lg border border-line bg-surface p-4">
              <p className="fi-eyebrow">Why this priority</p>
              <p className="fi-display mt-2 text-2xl font-medium">82</p>
              <p className="mt-2 text-xs leading-5 text-ink-muted">Core conversation workflow blocked · Three related reports · Repeated recent activity</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-surface p-4">
            <p className="fi-eyebrow">Source evidence</p>
            <blockquote className="mt-3 border-l-2 border-critical pl-3 text-sm leading-6">
              “Chat composer covers the newest message on iPhone.”
            </blockquote>
            <p className="fi-mono mt-3 text-[9px] text-ink-faint">iPhone · Safari · Screenshot attached</p>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-surface p-4">
            <p className="fi-eyebrow">Reporter activity</p>
            <p className="mt-2 text-xs text-ink-muted">Owner requested more detail → Reporter replied with viewport size → Issue moved to testing</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="fi-display text-lg font-medium">{value}</p>
      <p className="fi-mono mt-1 text-[9px] uppercase text-ink-faint">{label}</p>
    </div>
  );
}
