const reports = [
  ['BUG REPORT', 'Checkout freezes after I add a coupon.'],
  ['GENERAL', 'The discount box stopped responding on mobile.'],
  ['BUG REPORT', 'Apply code does nothing in Safari.'],
] as const;

export function ConvergenceVisual({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <p className="fi-eyebrow">Incoming reports</p>
          <p className="mt-2 text-xs text-ink-muted">Original evidence stays attached</p>
        </div>
        <div className="relative grid gap-4 p-5 lg:grid-cols-[1fr_.95fr] lg:gap-6">
          <div className="pointer-events-none absolute inset-y-5 left-1/2 hidden w-px border-l border-dashed border-line-strong lg:block" />
          <div className="space-y-3">
            {reports.map(([type, body]) => (
              <div key={body} className="rounded-lg border border-line bg-canvas p-3.5">
                <p className="fi-mono text-[9px] text-ink-faint">{type}</p>
                <p className="mt-2 text-sm leading-5">{body}</p>
              </div>
            ))}
          </div>
          <div className="self-center rounded-lg border border-ink bg-ink p-4 text-white">
            <p className="fi-mono text-[9px] text-white/55">GROUPED ISSUE</p>
            <p className="fi-display mt-3 text-lg font-medium leading-tight">Coupon action freezes checkout</p>
            <div className="mt-6 border-t border-white/20 pt-4">
              <p className="fi-mono text-[9px] text-white/55">3 REPORTS · 3 AFFECTED</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-4/5 bg-critical" />
              </div>
              <p className="fi-mono mt-2 text-[9px] text-white/55">HIGH ATTENTION</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="fi-mono text-[9px] text-ink-faint">SOURCE PRESERVED</span>
          <span className="fi-mono text-[9px] text-ink-faint">ISSUE FI-7K2M9A</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 pb-14 sm:min-h-[500px] sm:p-8 sm:pb-16">
      <div className="pointer-events-none absolute inset-y-0 left-[58%] hidden border-l border-dashed border-line-strong sm:block" />
      <p className="fi-eyebrow">Incoming reports</p>
      <div className="relative mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-[1fr_.88fr] sm:gap-8">
        <div className="space-y-3 sm:space-y-4">
          {reports.map(([type, body]) => (
            <div key={body} className="report-slip rounded-lg border border-line bg-canvas p-3.5 sm:p-4">
              <p className="fi-mono text-[9px] text-ink-faint">{type}</p>
              <p className="mt-2 text-sm leading-5 sm:mt-3">{body}</p>
            </div>
          ))}
        </div>
        <div className="issue-result self-center rounded-lg border border-ink bg-ink p-4 text-white sm:p-5">
          <p className="fi-mono text-[9px] text-white/55">GROUPED ISSUE</p>
          <p className="fi-display mt-3 text-lg font-medium leading-tight sm:text-xl">Coupon action freezes checkout</p>
          <div className="mt-6 border-t border-white/20 pt-4 sm:mt-8">
            <p className="fi-mono text-[9px] text-white/55">3 REPORTS · 3 AFFECTED</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-4/5 bg-critical" />
            </div>
            <p className="fi-mono mt-2 text-[9px] text-white/55">HIGH ATTENTION</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-3 sm:bottom-8 sm:left-8 sm:right-8">
        <span className="fi-mono text-[9px] text-ink-faint">SOURCE PRESERVED</span>
        <span className="fi-mono shrink-0 text-[9px] text-ink-faint">ISSUE FI-7K2M9A</span>
      </div>
    </div>
  );
}
