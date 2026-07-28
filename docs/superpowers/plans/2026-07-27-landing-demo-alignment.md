# Landing + Demo Alignment Implementation Plan

> **For agentic workers:** Implement task-by-task. Skip git commits unless the user asks. Steps use checkbox syntax for tracking.

**Goal:** Unify landing + `/demo` on the TrailVerse/FI-DEMO01 story and restyle mocks to match today’s Overview, exceptions Inbox, Issues, portal, and tracking.

**Architecture:** Extend `src/pages/demo/demoData.ts` as the shared story kit. Landing (`ConvergenceVisual`, previews) and `InteractiveDemoWorkspace` consume it. Mocks only — do not mount live owner/portal/tracking pages.

**Tech Stack:** React + TypeScript, existing `@/components/ui` primitives, Vitest + RTL.

## Global Constraints

- Canonical story: TrailVerse Demo / FI-DEMO01 mobile chat / FI-DEMO02 duplicate (no coupon/FI-7K2M9A).
- Do not change Base44 seed slug or owner app behavior.
- Quality gates: `npm run typecheck`, `npm test`, `npm run build`.
- No commits unless user requests.

---

### Task 1: Shared story kit + ConvergenceVisual

**Files:**
- Modify: `src/pages/demo/demoData.ts`
- Modify: `src/components/ConvergenceVisual.tsx`
- Modify: `src/pages/LandingPage.tsx` (evidence block)
- Test: `src/pages/LandingPage.test.tsx` (assert chat story, no coupon)

- [ ] Export `DEMO_PRODUCT`, hero report lines for convergence from `demoData.ts`
- [ ] Point `ConvergenceVisual` at shared data; title FI-DEMO01
- [ ] Replace landing evidence coupon block with FI-DEMO01 chat quote
- [ ] Extend landing test; run targeted tests

### Task 2: Landing form + workspace preview fidelity

**Files:**
- Modify: `src/pages/LandingPage.tsx` (`WorkspacePreview`, form stub)

- [ ] Form stub: type, describe, expected, screenshots hint, device-context strip
- [ ] Workspace preview stays TrailVerse/FI-DEMO01; nav Overview·Inbox·Issues·Resolved
- [ ] Run `LandingPage.test.tsx`

### Task 3: Rewrite InteractiveDemoWorkspace panes + steps

**Files:**
- Modify: `src/pages/demo/demoData.ts` (`DEMO_STEPS`)
- Modify: `src/pages/demo/InteractiveDemoWorkspace.tsx`
- Test: `src/pages/DemoPage.test.tsx`

- [ ] Steps: Overview → Inbox (exceptions) → Issues → Resolve → Reporter
- [ ] OverviewPane: briefing + needs attention + Live snapshot
- [ ] InboxPane: exceptions duplicate attention, app-like filters
- [ ] ReporterPane: status card, original report, environment stub, confirm/Not fixed
- [ ] Retarget jump actions; update DemoPage tests

### Task 4: Quality gates + visual smoke

- [ ] `npm run typecheck && npm test && npm run build`
- [ ] Screenshot `/` and `/demo` (desktop) for before/after proof if Subtext/browser available
