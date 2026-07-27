# VensaOS

## Branding decision

VensaOS is the public product brand and is positioned as a feedback intelligence platform. It is not a literal operating system.

The phrase “feedback inbox” may remain when it generically describes the workflow. Stable Base44 entities, function directories, database fields, API contracts, automation identifiers, routes, and tracking-token formats retain their existing technical names to avoid schema and migration risk.

## Technical Decisions

**Document:** 4 of 4
**Status:** Locked implementation contract
**Last updated:** July 23, 2026

This document locks the *how*. Documents 01–03 own the *what* (product, design,
flows). Where this document and 01–03 disagree on a mechanism, this document
wins. Do not expand product scope here.

---

## 1. Frontend Stack

```text
Scaffold:        Official Base44 React/Vite template
Language:        TypeScript, strict mode
Styling:         Tailwind CSS with the design tokens from document 02
Components:      Radix / shadcn primitives, customized to the VensaOS design
Routing:         React Router
Server data:     TanStack Query
Forms:           React Hook Form + Zod
Icons:           Lucide
Client state:    Local component state and URL state first
Global store:    No Zustand (or other global store) unless implementation reveals a concrete need
AI validation:   Zod schemas with safe fallback
Backend:         Base44 entities, functions, automations, auth, files, realtime
```

Rationale: the official Base44 React template already provides a Vite React
frontend, Tailwind styling, UI components, and a configured SDK client, which
removes most scaffold decisions. Base44 requires Node 20.19+ and Deno for local
backend functions.

---

## 2. PWA

```text
Library:         vite-plugin-pwa
Strategy:        Workbox generateSW
Caching:         App-shell caching
Offline:         Offline fallback page
Drafts:          Local preservation of unfinished public feedback drafts
Integrity:       No false "submitted" state while offline
```

---

## 3. Testing

```text
Unit:            Vitest
UI:              React Testing Library
End-to-end:      Playwright
```

Critical Playwright flows:

1. Create project
2. Submit public feedback
3. Convert report into issue
4. Group three duplicate reports
5. Keep unrelated report separate
6. Resolve issue
7. Verify tracking-page update
8. Verify project isolation between owners

---

## 4. Priority Formula

Locked in `docs/01_product_backend.md` §15. Summary:

```text
priorityScore = min(
  severityWeight
  + frequencyWeight            // (reportCount - 1) × 5, capped at 25
  + reproducibilityWeight      // confirmed 10, likely 5, unknown 0
  + rapidSpikeWeight           // +8 when ≥3 reports within 60 minutes
  + recentActivityWeight       // +5 when lastSeenAt within 24 hours
  + coreWorkflowWeight         // +15 when a core workflow is blocked
  + reopenedWeight,            // +12 when a resolved issue is reopened
  100
)
```

Severity weights: critical 50, high 30, medium 15, low 5.
Store the contributing factors in `priorityExplanation[]`.

---

## 5. Public Issue ID Strategy

```text
Internal identity:   Base44 built-in entity ID (all relationships use this)
Public issue code:   FI- followed by 6 uppercase Crockford Base32 characters
Example:             FI-7K2M9A
```

Rules:

- Generate the public code inside the backend function.
- Crockford Base32 alphabet, uppercase, 6 characters.
- Check for collision **within the project** before creating the issue; regenerate on collision.
- Never build per-project atomic counters for the MVP.

---

## 6. Report-Analysis Contract

`process-feedback` stage one. Validate model output with a Zod schema equivalent
to:

```ts
{
  summary: string,
  feedbackType: "bug" | "feature" | "general",
  category:
    | "ui_ux"
    | "functionality"
    | "performance"
    | "authentication"
    | "data"
    | "content"
    | "other",
  productArea: string,
  severity: "critical" | "high" | "medium" | "low",
  severityReasons: string[],
  keywords: string[],
  reproducibility: "confirmed" | "likely" | "unknown",
  coreWorkflowBlocked: boolean,
  confidence: number
}
```

Constraints:

- Summary maximum ~180 characters.
- Maximum 8 keywords.
- Confidence between 0 and 1.
- Preserve the reporter's original text separately; never overwrite `description`.
- Invalid model output must fail safely and leave the report reviewable.

---

## 7. Duplicate-Decision Contract

`process-feedback` stage two, run only when candidate issues exist. Validate with
a Zod schema equivalent to:

```ts
{
  candidateIssueId: string | null,
  sameUnderlyingIssue: boolean,
  decision: "auto_group" | "suggest" | "separate",
  confidence: number,
  matchingReasons: string[],
  conflictingEvidence: string[]
}
```

Thresholds (enforced by the backend, **not** by trusting the model's `decision`):

```text
>= 0.85     → auto_group
0.65–0.84   → suggest
< 0.65      → separate
```

---

## 8. Idempotency

The frontend generates a UUID `submissionKey` when a draft begins. Add
`submissionKey` to the `FeedbackSubmission` entity.

`submit-feedback` must:

1. Search the same project for an existing `submissionKey`.
2. Return the existing result when found.
3. Create only when no matching record exists.
4. Never duplicate a reporter access record on retries.

---

## 9. Reporter Tracking Token

```text
Generation:      32 cryptographically random bytes
Raw token:       Base64url encoded, returned to the reporter only once
Stored value:    SHA-256 hash in ReporterAccess (never store the raw token)
Expiration:      Default 30 days
```

---

## 10. Abuse Protection

Competition MVP scope:

- Validate all input server-side.
- Strict text and file size limits.
- MIME allowlist for screenshots.
- Honeypot field.
- Submission idempotency (see §8).
- Project-level submission cooldown.
- Optional Cloudflare Turnstile if time permits.

Do not build a distributed rate-limiting platform. Document any Base44
request-context limitation discovered during implementation.

---

## 11. Processing Architecture

Two stages:

1. Structured report analysis (§6).
2. Candidate issue comparison (§7), **only when candidate issues exist**.

Before the model comparison, filter candidates deterministically:

- Filter by project.
- Filter by active/recent status.
- Prefer same product area.
- Prefer same page path.
- Limit candidate count.

Use deterministic fallbacks when AI parsing fails. `process-feedback` must be
idempotent — re-running must not create duplicate links or inflate report counts.

---

## 12. Base44 Rules

- Use generated Base44 entity types; do not hand-maintain entity interfaces.
- Use row-level and field-level security for project isolation.
- Use service-role access only inside trusted backend functions.
- Recheck authorization inside every privileged function.
- Keep `process-feedback` idempotent.
- Preserve immutable activity history.
- Store private file references, not permanent public URLs.
- Test hosted function execution after deployment. Free runtime does **not**
  require Base44 Workflows; see `docs/free-runtime-architecture.md`.

---

## 13. Local vs Deployed Base44 Behavior

| Capability | Local `base44 dev` | Deployed free runtime |
|---|---|---|
| Entities (in-memory DB) | Yes (clears on stop) | Yes (persistent) |
| Functions | Yes (reload) | Yes |
| File uploads | Yes | Yes |
| Email/password auth | Yes | Yes |
| Realtime subscriptions | Yes | Yes |
| Base44 Workflows / legacy automations | **Not used** | **Not used** |
| Immediate `submit-feedback` processing | Yes | Yes |
| Activity-driven `run-free-maintenance` | Call directly | Owner page / Settings |

Core processing is invoked directly from `submit-feedback` and owner retry.
Scheduled queue/digest workers remain callable but are orchestrated by
`run-free-maintenance` on owner activity rather than paid Workflows.
