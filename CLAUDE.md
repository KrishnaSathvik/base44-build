# CLAUDE.md — VensaOS

Agent instructions for building **VensaOS**, a Base44-backed React PWA for
the Base44 Dev Build-Off. Keep this file concise; it references the specs rather
than duplicating them.

## Sources of Truth

Read these before implementing. They win over anything remembered:

1. `docs/01_product_backend.md` — product, entities, functions, priority formula
2. `docs/02_design_references.md` — design system, tokens, visual direction
3. `docs/03_uiux_flows.md` — routes, screen flows, build order
4. `docs/04_technical_decisions.md` — locked stack, AI contracts, IDs, idempotency, tokens, PWA, testing

## Locked Stack

Base44 React/Vite template · TypeScript strict · Tailwind + doc-02 tokens ·
Radix/shadcn (customized) · React Router · TanStack Query · React Hook Form + Zod ·
Lucide · Zod-validated AI I/O with safe fallback · `vite-plugin-pwa` (Workbox) ·
Vitest · React Testing Library · Playwright. No global store unless a concrete
need appears. Full detail in doc 04.

## Scope

MVP scope and postponed features are defined in doc 01 §5. Do not expand product
scope. Do not create additional planning documents.

## Build Order

The first milestone is **not** the landing page. Build the vertical slice first
(doc 03 §23 / §30): a real public report enters Base44, becomes an issue, appears
in the owner interface, is resolved, and updates the reporter tracking page. Only
then add screenshots, duplicate grouping, realtime, alerts, and PWA polish.

## Quality Gates

After each stage, run and report the results of:

```
npm run typecheck
npm test
npm run build
```

Do not claim a stage is complete without showing the command output.

## Base44 Rules

- Use **generated** Base44 entity types; never hand-maintain entity interfaces.
- Never invent Base44 APIs. When syntax or capability is uncertain, check the
  installed Base44 skills and current Base44 documentation before writing code.
- Enforce project isolation with row/field-level security; recheck authorization
  inside every privileged function.
- Keep `process-feedback` idempotent; preserve immutable activity history.
- Store private file references, not permanent public URLs.
- Automations do not run locally — test them after deployment (doc 04 §13).

## Reporting

At the end of each unit of work, report:

1. Files changed
2. Commands run and their results
3. Tests run and their results
4. Remaining risks or Base44 uncertainties needing verification

## Git

Nothing is committed or pushed unless explicitly requested.
