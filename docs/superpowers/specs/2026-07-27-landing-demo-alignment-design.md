# Landing + live demo alignment with app UI

Date: 2026-07-27  
Status: approved in conversation (Approach A)  
Scope: visual/copy alignment of landing and `/demo` with current Overview, Inbox (exceptions), Issues, public portal, and tracking — without mounting live owner pages.

## Goal

Landing and the interactive demo should feel like the same product as the real VensaOS app: one fake story, and chrome that matches today’s dashboard / feedback / tracking surfaces.

## Canonical story

Single narrative for landing + `/demo` (already seeded as TrailVerse Demo):

| Field | Value |
| --- | --- |
| Product | TrailVerse Demo |
| Primary issue | FI-DEMO01 — Mobile chat composer obscures new messages |
| Severity / status | HIGH · TESTING · priority 82 · 3 reports |
| Duplicate suggestion | FI-DEMO02 — Weather timeline is slow on older phones |
| Reports | `demo-chat-1/2/3` (existing copy) |

**Remove** the coupon / checkout / FI-7K2M9A story from landing (`ConvergenceVisual`, evidence section).

**Out of scope for story:** Base44 seed slug (`trailverse-demo`), user’s Groceries test board, OG image unless it still shows a wrong brand/story.

## Shared kit

Extend or thin-wrap `src/pages/demo/demoData.ts` as the single source for:

- Product name, issue, reports, duplicate, messages, activity
- Any small helpers landing needs (e.g. hero report lines for `ConvergenceVisual`)

Consumers:

- `ConvergenceVisual`
- `LandingPage` workspace + form previews + evidence block
- `InteractiveDemoWorkspace` (+ existing `demoData` imports)

No second parallel fake dataset.

## Landing UI

1. **Hero convergence** — Three chat reports → grouped FI-DEMO01 (same visual structure as today, new copy).
2. **Workspace preview** — Keep 3-pane mock (nav · list · detail). Detail remains FI-DEMO01 understanding / priority / evidence / activity. Nav labels: Overview · Inbox · Issues · Resolved. Optional Overview-style briefing cue is fine if it stays lightweight.
3. **Form preview** — Non-interactive stub shaped like the real portal: feedback type, describe, expected (optional), screenshots dropzone hint, short device-context strip. Keep `aria-hidden`.
4. **Evidence section** — FI-DEMO01 chat quote + metrics (reports / affected / last seen), not coupon.

## `/demo` walkthrough

Rewrite guided steps to match the real product loop:

| Step | View | What it shows |
| --- | --- | --- |
| 1 | Overview | Friday briefing + needs-attention row + compact Live snapshot (Connected / open / resolved) |
| 2 | Inbox (Exceptions) | Not a full report queue. Attention item: Possible duplicate (weather vs chat). Filters labeled like the app (`All attention`, etc.) |
| 3 | Issues | Grouped FI-DEMO01 (understanding, evidence, priority, activity) — owner investigates |
| 4 | Resolve | Same issue + resolve → toast about tracking update |
| 5 | Reporter tracking | Closer to real tracking: status card, original report snippet, environment stub, confirm / Not fixed |

Jump actions retargeted: open issue · review duplicate (Inbox) · priority · reporter view · Not fixed reopen.

Nav still maps Overview / Inbox / Issues / Resolved; Inbox opens the exceptions mock, Issues opens the grouped issue.

## Architecture

- **Mocks only** — Do not mount `Owner*Page`, `PublicPortalPage`, or `TrackingPage` inside the demo.
- **Visual fidelity** — Match labels, section structure, and empty/attention copy from the real pages; reuse shared UI primitives (`Badge`, `SeverityBadge`, `StatusBadge`, `Button`) where the demo already does.
- **Backend fixture** — Keep `base44/shared/demo-fixture.ts` TrailVerse content; only change if demo UI needs a field that the fixture already implies (no schema churn).

## Testing

- Update `DemoPage.test.tsx` / `LandingPage.test.tsx` for new copy and step labels (exceptions Inbox, Overview briefing, chat story instead of coupon).
- Keep e2e honesty checks: demo remains labeled as representative / non-live.
- Run `npm run typecheck`, `npm test`, `npm run build` after the change set.

## Explicit non-goals

- Mounting real authenticated pages with mock React Query providers
- Renaming or re-seeding the hosted demo project away from TrailVerse
- Redesigning landing marketing copy beyond story + preview fidelity
- Changing owner app behavior (Overview / Inbox / portal / tracking already shipped)

## Success criteria

1. Landing never shows coupon/checkout/FI-7K2M9A.
2. Landing workspace + form previews and `/demo` panes are recognizably the same product as the current app screenshots.
3. Demo Inbox teaches exceptions (duplicate), not “every incoming report.”
4. One shared data module drives landing + demo fake content.
