# Free-runtime architecture

VensaOS Build Week validation runs on the currently available free Base44 backend.
This document explains why Base44 Workflows are not used and how the product still
delivers the core feedback-to-issue experience.

## Why Workflows are not used

Base44 Workflows are a Builder-only capability. VensaOS currently has no paid users
and no subscription revenue. Paying for platform automation before demand is proven
is the wrong trade for a Build Week experiment.

The repository therefore declares **no** legacy automations and creates no dashboard Workflows.

## Immediate submission processing

```text
Reporter submits feedback
        ↓
submit-feedback validates and commits the submission
        ↓
shared processFeedbackSubmission(...) runs in the same request
        ↓
classification → duplicate decision → issue creation/grouping → priority
        ↓
tracking response returned
```

`process-feedback` remains callable for owner retries, focused testing, and a
future paid scheduler. It uses the same shared implementation.

## Deterministic AI fallback

Preferred path: Base44 `InvokeLLM` with structured Zod validation.

Fallback path (no external model call) activates when AI is unavailable, times
out, returns invalid output, or hits plan/credit errors:

* keyword-based category and severity
* normalized-text similarity for duplicates
* conservative auto-group thresholds
* existing deterministic priority formula (AI never chooses priority)

Fallback confidence is intentionally lower and labeled
`deterministic_fallback` in activity metadata and `ai_analysis_mode`.

## Activity-driven maintenance

`run-free-maintenance` replaces scheduled Workflows:

* pending/failed notification eligibility passes
* expired sending-lease recovery
* recent and duplicate-delivery reconciliation
* orphan attachment identification
* due daily-digest preparation

Owner pages (Overview, Inbox, Issues, Resolved, Settings) invoke it through
`useFreeMaintenance` at most once per five-minute browser session interval.
The backend lease prevents concurrent runs. Manual "Run maintenance now" in
Settings → Notifications → Operations bypasses the client throttle but still
respects the lease.

Honest limitation:

> When nobody is using VensaOS, background maintenance will not run.

That is acceptable while email delivery is disabled.

## Digest timing semantics

On the free runtime, daily digests are prepared when the workspace next becomes
active after the configured delivery time. They do not run while nobody is using
the workspace.

Dedupe remains one digest delivery per project local calendar date. Because
`NOTIFICATION_INTEGRATION_ENABLED=false` and project delivery defaults off,
digests are recorded as skipped/queued outcomes and are never represented as sent.

## Disabled email delivery

Keep:

```text
NOTIFICATION_INTEGRATION_ENABLED=false
notification_delivery_enabled=false
```

Outbox records, preferences, consent, templates, history, retries, and
reconciliation remain in product. Direct eligibility passes must never contact
SendEmail when gated off; they produce the existing `skipped` outcome.

## Future migration options

When revenue justifies it:

1. Reintroduce Base44 Workflows or an external scheduler for the existing
   `process-notification-queue` / `send-daily-digests` workers.
2. Keep shared modules unchanged — only the trigger changes.
3. Enable delivery gates deliberately after provider verification.

## Exact limitations

* No Workflow entity/scheduled triggers
* No exact five-minute/hourly background cadence without owner activity
* Digests may lag until the next owner session after the local hour
* AI quality depends on available integration credits; fallback is conservative
* Real reporter/critical/daily emails remain off until explicitly enabled
