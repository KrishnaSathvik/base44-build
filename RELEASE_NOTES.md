# VensaOS release candidate

This release candidate adds installable PWA behavior, project-scoped offline public drafts, account/project-scoped owner snapshots, route-level bundles, deterministic demo maintenance, automated accessibility smoke checks, and release gates.

## VensaOS rebrand

The public product brand is now VensaOS, positioned as a feedback intelligence platform for product teams. The landing page, application shell, authentication and setup, public portal attribution, tracking, demo, email templates, metadata, manifest, resilience UI, documentation, and release automation use the new brand. Stable Base44 entities, functions, fields, routes, automation identifiers, application identity, and tracking formats are intentionally unchanged.

## Known storage limitation

Private attachment records support logical deletion, access denial, and owner-only orphan reporting. Base44 does not currently document a physical private-file deletion API, so physical object removal remains a hosted operational limitation. No undocumented deletion endpoint is used.

## Verification boundary

Hosted automations, authenticated production flows, actual notification provider delivery, and deployment remain pending the final verification phase. The demo fixture does not claim that email was delivered.
