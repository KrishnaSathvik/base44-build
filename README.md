# VensaOS

**Base44 Dev Build-Off submission**

Feedback intelligence for product teams.

One public feedback link for users. One evidence-based workspace that shows product teams what to fix next.

Three people can describe the same bug differently; VensaOS classifies the reports, groups related ones, recalculates priority from affected users and impact, and keeps the original evidence attached while the owner resolves and closes the loop with reporters.

## Live product

| Surface | URL |
| --- | --- |
| Landing | https://vensaos.com/ |
| Interactive demo | https://vensaos.com/demo |
| Public feedback board (TrailVerse Demo) | https://vensaos.com/f/trailverse-demo |
| Owner workspace | https://vensaos.com/app |
| Privacy | https://vensaos.com/privacy |
| Terms | https://vensaos.com/terms |
| Security | https://vensaos.com/security |

`www.vensaos.com` permanently redirects to the apex domain. Site footer links: Demo · Security · Privacy · Terms.

## What to try (judge walkthrough)

1. **Landing** — Brand story, workspace preview, and the live-demo CTA.
2. **`/demo`** — Real owner chrome with representative TrailVerse fixture data and a guided walkthrough: Overview briefing → exceptions Inbox → grouped Issues → resolve → reporter tracking / “Not fixed” reopen. Interactive locally in the browser; nothing is saved to a live board.
3. **Public portal** — Open `/f/trailverse-demo`, submit a bug with optional screenshots and device context. Save the **private tracking link** (or opt into email updates) on the confirmation screen — without that link (and without email consent), reporters cannot recover the report later.
4. **Owner workspace** — Sign in at `/app`, open Overview / Inbox / Issues, review grouping and priority, resolve with a public note, then confirm the tracking page updates for the reporter.
5. **Trust pages** — Skim `/security`, `/privacy`, and `/terms` for data handling, collection notices, and service terms.

## Product loop

```text
Collect → Understand → Group → Prioritize → Resolve → Close the loop
```

- **Reporters** submit without an account; get a private tracking page; can follow up and confirm whether a fix worked.
- **Owners** see Overview attention, an exceptions Inbox (failed processing, duplicates, reporter replies), Issues as the main work queue, and Resolved history.
- **AI assist** classifies and suggests grouping with Zod-validated I/O and safe fallbacks when the model is unavailable. Owners stay in control of merges and status.

## Stack

- Base44 React/Vite app (TypeScript)
- Tailwind + design tokens from `docs/02_design_references.md`
- React Router, TanStack Query, React Hook Form + Zod
- Base44 entities + hosted functions (project-isolated)
- `vite-plugin-pwa` / Workbox
- Vitest, React Testing Library, Playwright

Stable Base44 entity names, function names, fields, and routes are intentional and unchanged by the VensaOS brand rename.

## Local development

```bash
npm install
cp .env.example .env.local   # fill Base44 app credentials as documented
npm run dev
```

Do not enable notification delivery for local tests.

### Verification

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run release:check
```

`release:check` forces `NOTIFICATION_INTEGRATION_ENABLED=false` so automated runs do not send real email.

### Demo fixture (Base44)

```bash
npm run demo:seed
npm run demo:verify
npm run demo:reset
```

## Specs

Sources of truth for product, design, flows, and technical decisions:

1. `docs/01_product_backend.md`
2. `docs/02_design_references.md`
3. `docs/03_uiux_flows.md`
4. `docs/04_technical_decisions.md`

## Honest limitations

- Real outbound email requires explicit delivery settings and the runtime gate; the demo does not claim email was delivered.
- Private attachment records support logical access control; physical private-file deletion depends on Base44 platform APIs.
- Automations that only run in the hosted Base44 environment should be verified after deploy — local free runtime prefers function-driven maintenance where documented.

## Base44 operations

This repo stays linked to its existing Base44 application. Do not rename the app slug, entities, functions, fields, or tracking formats for branding.

```bash
base44 login
base44 entities push
base44 deploy
```

Deploy only with explicit approval.
