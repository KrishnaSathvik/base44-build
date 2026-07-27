# VensaOS Vercel production setup

This document prepares the official frontend origin without performing a deployment, attaching a domain, or changing DNS. The public frontend origin and Base44 backend origin are separate: the Vite application is hosted by Vercel, while `@base44/sdk` continues to connect directly to the linked hosted Base44 backend. Do not proxy Base44 API, function, auth, or storage traffic through Vercel.

## Project configuration

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- SPA routing: retain the root `vercel.json` catch-all rewrite to `/index.html`

## Environment matrix

### Local development

- Application origin: `http://localhost:<actual-dev-port>`
- Base44 server: local development server through `VITE_BASE44_APP_BASE_URL` where configured
- Notification integration: disabled

### Vercel preview

- Runtime navigation and authentication callback: current preview origin
- Canonical production identity and durable public links: `https://vensaos.com`
- Indexing: `noindex, nofollow`
- Base44 SDK: hosted backend; no localhost override
- Notification integration: disabled

### Vercel production

- Application and canonical origin: `https://vensaos.com`
- Base44 SDK: hosted backend; `VITE_BASE44_APP_BASE_URL` absent
- Notification integration: disabled until separately approved

Configure these project environment variables before the first production build:

```dotenv
APP_BASE_URL=https://vensaos.com
NOTIFICATION_INTEGRATION_ENABLED=false
```

Do not create `VITE_APP_BASE_URL`: the canonical origin is enforced by the shared application-origin policy, and Vite-prefixed values are browser-visible. Do not add Base44 secrets, provider credentials, or authentication tokens to Vercel frontend variables.

For Preview, keep `NOTIFICATION_INTEGRATION_ENABLED=false` and do not set `VITE_BASE44_APP_BASE_URL`. Vercel system environment information is used only to apply preview `noindex`; it is never presented as a durable public link.

The linked Base44 backend also reads `APP_BASE_URL` when constructing notification links. In the separately authorized Base44 deployment phase, verify its hosted secret is changed to `https://vensaos.com` while `NOTIFICATION_INTEGRATION_ENABLED` remains `false`. Do not make that hosted change as part of this code-preparation task.

## Domains after the first reviewed deployment

In Project Settings → Domains, add both domains explicitly:

- Primary production domain: `vensaos.com`
- Secondary domain: `www.vensaos.com`
- Permanent redirect: `www.vensaos.com` → `https://vensaos.com`

The application does not implement a competing domain redirect or treat `www` as a canonical origin.

## DNS and TLS after domain attachment

- Use the exact DNS records displayed by Vercel for each domain; do not substitute generic records from documentation.
- Preserve existing MX, TXT, DKIM, SPF, verification, and other email-related records.
- Verify both domains in Vercel.
- Wait for valid SSL issuance on both domains before declaring the domain live.
- Do not change DNS until the deployment and this checklist have been reviewed.

## Base44 authentication follow-up

After the frontend deployment exists, review the linked Base44 application's documented authentication redirect/origin allowlist and add the exact production origin `https://vensaos.com` plus any intentionally supported preview callback origins. Email/password and OTP flows use the existing SDK session flow. Google OAuth callbacks preserve only the current same-origin pathname; arbitrary external `returnTo`, `from`, or `next` URLs are not accepted by the application.

Do not invent callback paths or change Base44 auth configuration without a separate hosted-configuration review.

## URL-source audit

1. Canonical public origin: `base44/shared/configuration.ts` owns `https://vensaos.com` and the safe URL builders used by route metadata, feedback-board links, reporter tracking links, owner email links, robots, and sitemap output.
2. Current browser origin: used only for clearly local development links and same-origin authentication callbacks. Reporter environment disclosure may record the reporter-approved current page URL; it is product evidence, not an application-origin setting.
3. Base44 backend origin: `src/lib/config.ts` and `src/api/base44Client.ts` preserve the linked Base44 app ID. Production omits `serverUrl`; service-worker rules keep Base44 API/auth/function requests network-only.
4. Local-development origin: `VITE_BASE44_APP_BASE_URL`, the Vite/Playwright loopback servers, and local validation fixtures remain intentionally local and never become production metadata or durable links.
5. Preview-deployment origin: used only for preview runtime navigation and authentication return. Preview builds retain the apex canonical identity, emit `noindex, nofollow`, and never copy a `vercel.app` URL as a permanent board or tracking link.
6. External third-party URLs: the Vercel JSON schema, XML sitemap namespace, product URL fields, and cited documentation remain external by design.
7. Historical or test fixtures: the legacy Base44 app identity, IndexedDB database, draft-preservation event, and focused rejection fixtures remain stable technical identifiers rather than public product origins.

Clipboard actions in setup, overview, and settings all use the public-board builder. There is currently no QR generator or Web Share API implementation, so no separate QR/share URL source exists to migrate. If either feature is added later, it must consume the same public-board builder rather than `window.location.origin`.
