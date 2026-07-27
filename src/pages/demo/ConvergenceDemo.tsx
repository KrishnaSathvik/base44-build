export function ConvergenceDemo() {
  return (
    <div className="grid overflow-hidden rounded-xl border border-line bg-surface lg:grid-cols-[1fr_1fr]">
      <section className="border-b border-line p-6 lg:border-b-0 lg:border-r">
        <p className="fi-eyebrow">3 related mobile reports</p>
        {['Chat composer covers the newest message on iPhone.', 'Keyboard leaves the conversation scrolled above the reply.', 'Latest chat bubble is hidden behind the mobile composer.'].map((x, i) => (
          <div key={x} className="mt-4 rounded-lg border border-line bg-canvas p-4">
            <p className="fi-mono text-[9px] text-ink-faint">REPORT {String(i + 1).padStart(2, '0')} · {i === 2 ? 'AUTO-GROUPED' : 'RELATED'}</p>
            <p className="mt-2 text-sm">{x}</p>
          </div>
        ))}
        <p className="mt-5 text-xs text-ink-muted">Representative demo state — not a live model transcript. Live boards use Base44 managed InvokeLLM with deterministic fallback when unavailable.</p>
      </section>
      <section className="p-6">
        <p className="fi-eyebrow">1 normalized issue</p>
        <div className="mt-4 border-t-2 border-ink pt-5">
          <p className="fi-mono text-[10px] text-ink-faint">FI-7K2M9A · HIGH</p>
          <h2 className="fi-display mt-3 text-3xl font-medium">Mobile chat composer obscures new messages</h2>
          <p className="mt-4 leading-7 text-ink-muted">The on-screen keyboard and fixed composer can hide the latest conversation content on mobile viewports.</p>
          <div className="mt-6 rounded-lg bg-surface-subtle p-4">
            <p className="fi-eyebrow">How VensaOS understood this</p>
            <ul className="mt-3 space-y-1 text-xs leading-5 text-ink-muted">
              <li>Category: UI UX · Product area: Mobile chat</li>
              <li>Reproducibility: likely · Core workflow: blocked</li>
              <li>Analysis method: representative demo contract</li>
              <li>Matching reasons: same composer occlusion · mobile viewport</li>
            </ul>
          </div>
          <div className="mt-6 rounded-lg bg-surface-subtle p-4">
            <p className="fi-eyebrow">Priority 82</p>
            <p className="mt-2 text-xs leading-5 text-ink-muted">Core conversation workflow blocked · 3 related reports · reproducible on mobile · recent repeated activity</p>
          </div>
          <div className="mt-8 grid grid-cols-2 border-y border-line py-5">
            <div><p className="fi-display text-2xl">3</p><p className="fi-mono text-[9px] text-ink-faint">REPORTS</p></div>
            <div><p className="fi-display text-2xl">3</p><p className="fi-mono text-[9px] text-ink-faint">AFFECTED USERS</p></div>
          </div>
          <p className="mt-5 text-xs text-ink-muted">A separate weather-screen performance report remains ungrouped. One 0.72-confidence relationship waits for owner review. Owners can correct classification and reverse automatic grouping.</p>
        </div>
      </section>
    </div>
  );
}
