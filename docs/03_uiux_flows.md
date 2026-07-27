# VensaOS
## End-to-End UI/UX Flows and Competition Build Blueprint

**Document:** 3 of 3  
**Status:** Screen and interaction specification  
**Last updated:** July 22, 2026

---

## 1. Purpose of This Document

This document translates the product and design direction into:

- information architecture;
- routes;
- screen-by-screen flows;
- responsive behavior;
- component states;
- Mermaid diagrams;
- acceptance criteria; and
- an implementation order for the competition.

Use it together with:

1. `01_product_backend.md`
2. `02_design_references.md`

---

## 2. Experience Map

There are three connected experiences:

```mermaid
flowchart LR
    A["Marketing and onboarding"] --> B["Owner workspace"]
    A --> C["Public reporter portal"]
    C --> D["Private reporter tracking"]
    B --> D
```

### Owner workspace

Authenticated:

- Overview
- Inbox
- Issues
- Issue detail
- Resolved
- Project settings

### Public reporter portal

No account required:

- Select feedback type
- Submit report
- Confirmation

### Reporter tracking

Private token link:

- View status
- Read public updates
- Provide more information
- Confirm resolution

---

## 3. Route Map

```text
/
├── /demo
├── /login
├── /signup
├── /onboarding
│   ├── /project
│   ├── /feedback-settings
│   └── /share
├── /app
│   ├── /overview
│   ├── /inbox
│   ├── /issues
│   ├── /issues/:issueId
│   ├── /resolved
│   └── /settings
│       ├── /general
│       ├── /portal
│       └── /notifications
├── /f/:projectSlug
│   ├── /bug
│   ├── /feature
│   ├── /general
│   └── /submitted/:submissionId
└── /track/:token
```

Route behavior:

- `/f/:projectSlug` is public.
- `/track/:token` is public but token-protected.
- `/app/*` requires owner authentication.
- Preserve the intended owner route through authentication.
- Invalid public slug uses a branded not-found state, not the owner 404 page.

---

## 4. Information Architecture

```mermaid
flowchart TD
    A["VensaOS"] --> B["Marketing"]
    A --> C["Owner app"]
    A --> D["Public portal"]
    A --> E["Tracking"]

    B --> B1["Landing"]
    B --> B2["Demo"]
    B --> B3["Sign in / sign up"]

    C --> C1["Overview"]
    C --> C2["Inbox"]
    C --> C3["Issues"]
    C --> C4["Resolved"]
    C --> C5["Settings"]

    C2 --> C21["Unreviewed reports"]
    C2 --> C22["Possible duplicates"]
    C2 --> C23["Processing failures"]
    C2 --> C24["Needs response"]

    C3 --> C31["Open"]
    C3 --> C32["Planned"]
    C3 --> C33["In progress"]
    C3 --> C34["Testing"]

    C5 --> C51["General"]
    C5 --> C52["Public portal"]
    C5 --> C53["Notifications"]

    D --> D1["Select type"]
    D --> D2["Feedback form"]
    D --> D3["Confirmation"]

    E --> E1["Status"]
    E --> E2["Public updates"]
    E --> E3["Provide more information"]
    E --> E4["Resolution confirmation"]
```

---

## 5. New Owner Onboarding

### Goal

Create a usable feedback portal in under two minutes.

```mermaid
flowchart LR
    A["Landing"] --> B["Create account"]
    B --> C["Create project"]
    C --> D["Choose feedback types"]
    D --> E["Configure reporter options"]
    E --> F["Generate public link"]
    F --> G["Submit test report"]
    G --> H["Open owner dashboard"]
```

### Screen 5.1 — Landing

**Primary goal:** Explain the transformation from raw feedback to prioritized issues.

Content:

- Hero
- Three-report-to-one-issue visual
- How it works
- Evidence preview
- Public-form preview
- CTA

Primary CTA:

`Create a feedback board`

Secondary CTA:

`View demo`

### Screen 5.2 — Sign up

Use Base44 authentication.

Keep the page minimal:

- Logo
- One sentence
- Authentication control
- Link to sign in

Do not request product details on this screen.

### Screen 5.3 — Create project

Fields:

- Product name
- Product URL
- Product type
- Short description
- Optional logo

Validation:

- Required name
- Valid URL when present
- Slug availability
- Logo MIME and size

Primary action:

`Continue`

### Screen 5.4 — Choose feedback types

Three toggles selected by default:

- Bug reports
- Feature requests
- General feedback

Optional categories can be added later in settings.

### Screen 5.5 — Reporter options

Options:

- Allow anonymous feedback
- Ask for email
- Let reporters receive updates
- Collect page URL
- Collect browser and device context
- Allow screenshots

Use explanatory text beside each option.

### Screen 5.6 — Share portal

Show:

- Public link
- Copy action
- Open portal
- Submit a test report

The recommended next action is `Submit a test report`, not “Go to dashboard.”

### Onboarding acceptance criteria

- Browser back preserves entered values.
- Refresh after project creation does not create a duplicate.
- Owner can skip logo.
- Generated link is usable immediately.
- Test submission appears in the dashboard.

---

## 6. Public Reporter Flow

```mermaid
flowchart TD
    A["Open public project URL"] --> B["Load public project branding"]
    B --> C{"Project active?"}
    C -->|No| D["Show reports-closed state"]
    C -->|Yes| E["Choose feedback type"]

    E --> F["Bug"]
    E --> G["Feature"]
    E --> H["General"]

    F --> I["Bug form"]
    G --> J["Feature form"]
    H --> K["General form"]

    I --> L["Add screenshot and context"]
    J --> L
    K --> L

    L --> M["Review"]
    M --> N["Submit"]
    N --> O{"Success?"}
    O -->|Yes| P["Confirmation and tracking link"]
    O -->|No| Q["Preserve draft and show retry"]
```

### Screen 6.1 — Public portal entry

Header:

- Product logo
- Product name
- Optional product link

Copy:

> Help us improve [Product]. Report a problem or share an idea. It usually takes less than a minute.

Feedback-type cards:

1. Report a problem
2. Suggest an improvement
3. Share general feedback

Each includes one supporting sentence.

### Screen 6.2 — Bug form

Start with:

**What happened?**

Fields shown initially:

- Description
- Screenshot

Progressively reveal:

- What did you expect?
- Can you reproduce it?
- Page URL
- Optional email

Do not force a multi-step wizard unless mobile testing proves it reduces friction.

### Screen 6.3 — Feature-request form

Questions:

- What would you like to do?
- Why would this be useful?
- How do you handle it today? — optional
- Screenshot or mockup — optional
- Email — optional

### Screen 6.4 — General-feedback form

Questions:

- What would you like us to know?
- Screenshot — optional
- Email — optional

### Screen 6.5 — Attachment flow

```mermaid
flowchart LR
    A["Choose screenshot"] --> B["Validate MIME and size"]
    B --> C{"Valid?"}
    C -->|No| D["Explain error"]
    C -->|Yes| E["Show local preview"]
    E --> F["Upload privately"]
    F --> G{"Upload success?"}
    G -->|No| H["Retry or remove"]
    G -->|Yes| I["Attach private file URI to draft"]
```

States:

- Empty
- Drag active
- Preview
- Uploading
- Uploaded
- Failed
- Removed

### Screen 6.6 — Context review

Display:

```text
CONTEXT ATTACHED

Browser      Safari 18
Device       iPhone
Screen       390 × 844
Page         /chat
```

Let the user remove page URL, browser/device metadata, and email.

### Screen 6.7 — Submission

Primary button:

`Submit feedback`

During submission:

1. Securing attachment
2. Sending report
3. Creating tracking link

Do not block the confirmation screen on duplicate processing. Processing continues asynchronously.

### Screen 6.8 — Confirmation

Title:

> Thanks — your feedback was submitted.

Show:

- reference code;
- report type;
- received status;
- private tracking link;
- copy link;
- return to product; and
- submit another report.

If the reporter supplied an email and opted in:

> We’ll email you when the status changes.

### Public-flow acceptance criteria

- Works without account.
- Supports keyboard and mobile input.
- Draft survives accidental refresh where practical.
- User can remove optional context.
- Failed submission retains text.
- Duplicate processing is not exposed as certainty to reporter.
- Confirmation loads quickly.

---

## 7. Owner Overview Flow

```mermaid
flowchart TD
    A["Owner opens app"] --> B["Load project summary"]
    B --> C["Show attention headline"]
    C --> D["Show critical and high-priority queue"]
    C --> E["Show pending duplicate reviews"]
    C --> F["Show live processing activity"]

    D --> G["Open issue"]
    E --> H["Review grouping"]
    F --> I["Open source report"]
```

### Overview content order

1. Attention headline
2. Critical/high issues
3. Pending grouping decisions
4. Live processing
5. Recently resolved

### Empty overview

> Nothing needs attention right now.

Actions:

- Copy feedback link
- Submit test feedback

### Overview interaction rules

- Clicking a priority item opens issue detail.
- Clicking a processing event opens source report.
- New critical items announce through `aria-live`.
- Do not auto-reorder while the owner is using a keyboard-selected row; stage updates safely.

---

## 8. Owner Inbox Flow

The inbox is report-centric.

```mermaid
flowchart TD
    A["Open Inbox"] --> B["Load unreviewed reports"]
    B --> C["Apply saved filter"]
    C --> D["Select report"]
    D --> E["Show report evidence"]
    E --> F{"Recommended action"}

    F -->|Existing issue match| G["Review duplicate"]
    F -->|No match| H["Confirm new issue"]
    F -->|Missing information| I["Request more info"]
    F -->|Invalid| J["Dismiss"]

    G --> K["Accept or reject match"]
    H --> L["Edit issue title and create"]
    I --> M["Send public request"]
    J --> N["Record dismissal reason"]
```

### Inbox filters

MVP:

- All
- Unreviewed
- Possible duplicates
- Processing failed
- Needs information
- Has screenshots

Advanced query builder is out of scope.

### Inbox report row

Shows:

- severity;
- normalized title;
- original excerpt;
- product area;
- browser/device;
- time;
- screenshot;
- processing state; and
- candidate issue.

### Selected-report detail

Sections:

- Original report
- Expected behavior
- Screenshot
- Context
- AI classification
- Candidate issues
- Activity
- Owner actions

### Processing states

#### Pending

> Waiting to process

#### Processing

> Classifying and checking related issues

#### Failed

> Processing failed

Action:

`Retry`

The owner can still inspect original evidence when processing fails.

---

## 9. Duplicate Review Flow

```mermaid
flowchart TD
    A["Open duplicate suggestion"] --> B["Show source report"]
    B --> C["Show candidate issue"]
    C --> D["Show matching reasons"]
    D --> E["Show similarity confidence"]
    E --> F{"Owner decision"}

    F -->|Merge| G["Attach report to candidate issue"]
    F -->|Keep separate| H["Create or retain separate issue"]
    F -->|Choose another| I["Search open issues"]
    F -->|Defer| J["Keep pending"]

    G --> K["Recalculate counts and priority"]
    H --> K
    I --> G
    K --> L["Write activity event"]
    L --> M["Realtime update"]
```

### Duplicate comparison layout

Desktop:

- Left: source report
- Right: candidate issue
- Bottom: reasons and actions

Mobile:

- Tabs: New report, Existing issue, Comparison
- Sticky action bar

### Required explanation

- matching product area;
- shared concepts;
- page overlap;
- environment overlap;
- confidence; and
- conflicting evidence.

### Merge confirmation

> This report will become the fourth report linked to FI-7K2M9A. Priority is expected to increase from 64 to 69.

---

## 10. Issue List Flow

```mermaid
flowchart LR
    A["Open Issues"] --> B["Choose status view"]
    B --> C["Open"]
    B --> D["Planned"]
    B --> E["In progress"]
    B --> F["Testing"]
    C --> G["Select issue"]
    D --> G
    E --> G
    F --> G
    G --> H["Open issue detail"]
```

### List controls

- Search
- Status segmented control
- Severity filter
- Product-area filter
- Sort:
  - Priority
  - Most reports
  - Recently active
  - Oldest

Default: `Priority`

### Issue row

- issue ID;
- title;
- severity;
- report count;
- affected users;
- current status;
- last activity; and
- priority-explanation preview.

---

## 11. Issue Detail Flow

```mermaid
flowchart TD
    A["Open issue"] --> B["Read summary"]
    B --> C["Review user evidence"]
    C --> D["Review grouping explanation"]
    D --> E["Inspect environment and screenshots"]
    E --> F["Review activity timeline"]
    F --> G{"Owner action"}

    G -->|Change status| H["Validate transition"]
    G -->|Change priority| I["Record manual override"]
    G -->|Merge issue| J["Select target"]
    G -->|Separate report| K["Select report"]
    G -->|Request info| L["Select reporter"]
    G -->|Resolve| M["Add public resolution note"]

    H --> N["Update issue"]
    I --> N
    J --> N
    K --> N
    L --> O["Create public request"]
    M --> P["Notify opted-in reporters"]
    N --> Q["Append activity event"]
    O --> Q
    P --> Q
```

### Issue-detail screen anatomy

#### Header

- Issue ID
- Title
- Status
- Severity
- Report count
- Affected users
- First/last seen
- Primary actions

#### Executive summary

AI-generated but clearly labeled.

#### What users reported

Original source quotes.

#### Why grouped

Signals and confidence.

#### Environment

- Device
- Browser
- Page
- App version if supplied
- Report timeline

#### Attachments

Grid on desktop, horizontal gallery on mobile.

#### Reports

All linked reports with the ability to separate.

#### Activity

Append-only timeline.

#### Resolution

Public note and notification preview.

### Issue-detail acceptance criteria

- Owner can always reach original evidence.
- AI summary is distinguishable from source.
- Internal and public notes are separate.
- Merge/unmerge is reversible.
- Signed screenshot URLs can refresh when expired.
- Status-transition failure does not erase drafted note.

---

## 12. Status Change Flow

```mermaid
sequenceDiagram
    actor Owner
    participant UI as Issue Detail
    participant Function as update-issue-status
    participant DB as Base44 Entities
    participant Realtime as Subscription
    participant Notify as Email Integration
    actor Reporter

    Owner->>UI: Choose new status
    UI->>UI: Show required fields
    Owner->>UI: Add public or internal note
    UI->>Function: Submit transition
    Function->>DB: Verify project access
    Function->>DB: Validate transition
    Function->>DB: Update issue
    Function->>DB: Append activity event
    DB-->>Realtime: Publish change
    Realtime-->>UI: Confirm updated state

    alt Public update and reporter opted in
        Function->>Notify: Send status email
        Notify-->>Reporter: Status changed
    end
```

### Transition-specific requirements

- `Needs info`: requires a public question.
- `Resolved`: requires a public resolution note.
- `Dismissed`: requires an internal reason; public note optional.
- `Duplicate`: requires a target issue.
- `Reopened`: preserves prior resolution history.

---

## 13. Reporter Tracking Flow

```mermaid
flowchart TD
    A["Open private tracking link"] --> B{"Token valid?"}
    B -->|No| C["Expired or invalid link"]
    B -->|Yes| D["Show report summary and status"]
    D --> E["Show public activity"]
    E --> F{"Owner requested information?"}

    F -->|Yes| G["Reporter replies"]
    G --> H["Upload optional screenshot"]
    H --> I["Submit follow-up"]
    I --> J["Owner notified"]

    F -->|No| K{"Issue resolved?"}
    K -->|No| D
    K -->|Yes| L["Ask if fixed"]
    L -->|Yes| M["Record confirmation"]
    L -->|No| N["Reopen report"]
```

### Tracking-page content

Safe fields only:

- report reference;
- original reporter text;
- issue title;
- current status;
- public owner updates;
- request for information;
- follow-up form; and
- resolution confirmation.

Never show:

- other reporters’ emails;
- internal notes;
- project analytics;
- private matching scores not intended for reporter; or
- owner-only screenshots from other reports.

---

## 14. Settings Flow

```mermaid
flowchart TD
    A["Settings"] --> B["General"]
    A --> C["Public portal"]
    A --> D["Notifications"]

    B --> B1["Name, URL, description, logo"]
    B --> B2["Archive project"]

    C --> C1["Feedback types"]
    C --> C2["Anonymous reports"]
    C --> C3["Email and updates"]
    C --> C4["Context collection"]
    C --> C5["Screenshot uploads"]
    C --> C6["Copy public link"]

    D --> D1["Critical alerts"]
    D --> D2["Daily digest"]
    D --> D3["Reporter status emails"]
```

Do not include integrations or billing in the competition MVP.

---

## 15. Responsive Owner Flows

### Desktop ≥ 1100px

```text
Left rail | List/queue | Evidence/detail
```

Behavior:

- selected report remains highlighted;
- detail updates without losing list scroll;
- URL changes to preserve selection; and
- right panel may widen for screenshots.

### Tablet 768–1099px

```text
Collapsible rail | Main list
                     ↓
                 Slide-over detail
```

### Mobile < 768px

```text
Bottom navigation
Single list
Full-screen detail route
Sticky action bar
```

```mermaid
flowchart TD
    A["Viewport detected"] --> B{"Width"}
    B -->|Desktop| C["Three-panel workspace"]
    B -->|Tablet| D["List plus slide-over detail"]
    B -->|Mobile| E["Single-column routes"]
```

---

## 16. Mobile Public Form Flow

Mobile is the primary reporter surface.

```mermaid
flowchart TD
    A["Open portal"] --> B["Choose type"]
    B --> C["Enter primary description"]
    C --> D["Add photo or screenshot"]
    D --> E["Expand optional details"]
    E --> F["Review context"]
    F --> G["Sticky Submit"]
    G --> H["Confirmation"]
```

Mobile requirements:

- no horizontal scrolling;
- 44px controls;
- native file picker;
- textarea does not hide behind keyboard;
- sticky submit appears only when useful;
- browser back preserves form; and
- error summary scrolls to field.

---

## 17. Realtime Interaction Flow

```mermaid
sequenceDiagram
    participant Backend as Base44 Function
    participant DB as Entity Store
    participant Sub as Realtime Subscription
    participant Store as Client State
    participant UI as Owner UI

    Backend->>DB: Create or update issue
    DB-->>Sub: Entity event
    Sub-->>Store: Normalized record update
    Store-->>UI: Re-render affected row and counters
    UI-->>UI: Announce critical change if needed
```

### Realtime UX rules

- Do not show a toast for every ordinary report.
- Show inline movement and count updates.
- Use toast only for critical events, failed actions, or owner-requested background completion.
- Preserve selected item.
- Avoid sudden list jumps while user is reading.
- Show a small `New updates` control when automatic reordering would be disruptive.

---

## 18. Loading and Processing Flow

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Uploading: Attachment selected
    Uploading --> DraftReady: Upload complete
    Uploading --> UploadFailed: Upload error
    UploadFailed --> Uploading: Retry
    DraftReady --> Submitting: Submit
    Submitting --> Submitted: Report accepted
    Submitting --> SubmitFailed: Request failed
    SubmitFailed --> Submitting: Retry
    Submitted --> Processing: Backend workflow
    Processing --> Processed: Classification complete
    Processing --> ProcessingFailed: Workflow error
    ProcessingFailed --> Processing: Owner retries
```

Reporter sees only through `Submitted`. Owner sees processing states.

---

## 19. Notification Flows

### Critical owner alert

```mermaid
flowchart LR
    A["Critical issue detected"] --> B["Check recent alert history"]
    B --> C{"Already alerted?"}
    C -->|Yes| D["Update issue without duplicate email"]
    C -->|No| E["Send concise owner alert"]
    E --> F["Record notification event"]
```

### Reporter update

```mermaid
flowchart LR
    A["Public status change"] --> B["Find opted-in reporters"]
    B --> C["Generate safe update"]
    C --> D["Send email"]
    D --> E["Record delivery result"]
```

---

## 20. Screen Inventory

### Marketing

1. Landing
2. Demo

### Authentication and onboarding

3. Sign up / sign in
4. Create project
5. Feedback settings
6. Share portal

### Owner

7. Overview
8. Inbox
9. Report detail
10. Duplicate comparison
11. Issues
12. Issue detail
13. Resolved
14. Project settings

### Reporter

15. Portal entry
16. Bug form
17. Feature form
18. General form
19. Submission confirmation
20. Tracking page

Several screens share one route and shell. The competition does not require 20 independent visual designs.

---

## 21. Component-to-Screen Map

| Component | Screens |
|---|---|
| App shell | All owner screens |
| Public project header | Portal and tracking |
| Feedback-type card | Portal |
| Feedback-form shell | Bug, feature, general |
| Private file uploader | Forms and reporter follow-up |
| Context disclosure | Forms |
| Report row | Inbox |
| Report-evidence panel | Inbox and issue detail |
| Duplicate comparison | Inbox and issue detail |
| Issue row | Overview, issues, resolved |
| Issue header | Issue detail |
| Evidence quote | Issue detail |
| Grouping explanation | Issue detail |
| Environment breakdown | Issue detail |
| Activity timeline | Report and issue detail |
| Tracking status card | Tracking |
| Empty state | All lists |
| Processing indicator | Inbox and report detail |

---

## 22. Competition Build Order

### Day 1 — Foundation and public form

- Create fresh Base44 project.
- Define core entities.
- Set up owner authentication.
- Create project onboarding.
- Build public portal and text submission.
- Create owner inbox showing raw reports.

### Day 2 — Processing

- Implement `submit-feedback`.
- Implement `process-feedback`.
- Create issues and activity events.
- Add deterministic priority.
- Add processing states and retry.

### Day 3 — Duplicate grouping

- Candidate retrieval.
- Structured similarity.
- Automatic grouping.
- Owner duplicate review.
- Merge and unmerge.
- Seed demo reports.

### Day 4 — Issue workflow and realtime

- Issue detail.
- Status transitions.
- Reporter tracking.
- Realtime subscriptions.
- Critical owner alert.

### Day 5 — Screenshots and design system

- Private upload.
- Signed attachment viewing.
- Apply design tokens.
- Desktop workspace.
- Mobile public flow.

### Day 6 — PWA, accessibility, reliability

- Manifest and app shell.
- Draft preservation.
- Offline states.
- Keyboard support.
- Security testing.
- Automation deployment testing.

### Day 7 — Demo and submission

- Polish loading and empty states.
- Verify responsive breakpoints.
- Run exact demo repeatedly.
- Record walkthrough.
- Complete competition submission.
- Keep app deployed for judging.

Adjust dates to remaining competition time. Prioritize a stable demo over every listed screen.

---

## 23. First Implementation Slice

Build one vertical slice before creating the full dashboard:

```mermaid
flowchart LR
    A["Create project"] --> B["Open public link"]
    B --> C["Submit text report"]
    C --> D["Create issue"]
    D --> E["Show issue to owner"]
    E --> F["Resolve issue"]
    F --> G["Show resolution on tracking page"]
```

Only after this works should the team add screenshots, duplicate grouping, realtime, alerts, and PWA polish.

This prevents a beautiful frontend with no reliable backend loop.

---

## 24. Demo Data

Create one sample project:

```text
Product: TrailVerse Demo
Environment: Production
Feedback URL: /f/trailverse-demo
```

Seed candidate issue:

```text
FI-7K2M9A
Chat messages use incorrect width on mobile
Status: Open
Severity: High
```

Demo reports:

1. “My outgoing chat bubble is centered and leaves too much empty space on iPhone.”
2. “Messages do not use the screen width in mobile Safari.”
3. “The chat layout looks broken after the latest update.”
4. Unrelated control: “Weather page takes too long to load.”

Expected:

- first three group; and
- fourth creates another issue.

---

## 25. UX Test Scenarios

### Reporter

1. Submit text-only bug.
2. Submit screenshot bug.
3. Remove captured page URL.
4. Lose network while submitting.
5. Retry preserved draft.
6. Open private tracking link.
7. Respond to information request.
8. Confirm a resolution did not fix the issue.

### Owner

1. Create first project.
2. Copy public link.
3. Receive report in real time.
4. Inspect original evidence.
5. Accept suggested duplicate.
6. Reject incorrect duplicate.
7. Unmerge a report.
8. Retry failed processing.
9. Mark issue resolved.
10. Verify reporter tracking update.

### Security

1. Use another owner account to request the project.
2. Try listing public reports without auth.
3. Use expired tracking token.
4. Use tracking token for another report.
5. Open expired screenshot signed URL.
6. Submit unsupported attachment.

---

## 26. Screen Definition Template

For each screen built, record:

```text
Screen:
Route:
Primary user:
Primary goal:
Entry points:
Main content:
Primary action:
Secondary actions:
Loading state:
Empty state:
Error state:
Mobile behavior:
Accessibility:
Backend calls:
Realtime subscriptions:
Analytics events:
Acceptance criteria:
```

Use this template in implementation notes. Do not create a separate planning document for every screen unless necessary.

---

## 27. Product Analytics Events — Post-MVP Friendly

```text
project_created
feedback_portal_opened
feedback_type_selected
attachment_uploaded
feedback_submitted
tracking_link_copied
report_processing_completed
report_processing_failed
duplicate_suggested
duplicate_accepted
duplicate_rejected
report_unmerged
issue_status_changed
issue_resolved
reporter_follow_up_submitted
resolution_confirmed
issue_reopened
```

Do not let analytics delay the competition MVP.

---

## 28. UX Acceptance Checklist

### Public portal

- Product purpose is clear in five seconds.
- Feedback type is keyboard selectable.
- Description is the first meaningful field.
- Context collection is transparent.
- Screenshot preview is removable.
- Error does not erase data.
- Confirmation provides a private tracking link.

### Owner inbox

- New reports are visible.
- Processing state is clear.
- Original evidence is one click away.
- Duplicate recommendation explains itself.
- Owner can correct the system.

### Issue detail

- Report count and affected users are distinct.
- Original quotes are visible.
- Screenshot access is secure.
- Grouping reasons are visible.
- Priority explanation is visible.
- Status and resolution controls are clear.

### Responsive

- Public form works at 320px width.
- Mobile keyboard does not cover CTA.
- Owner detail is usable as a full-screen route.
- Desktop list retains context.
- Tablet layout avoids cramped three-column UI.

### Accessibility

- Focus is never trapped unintentionally.
- Live updates are announced appropriately.
- Severity includes text.
- Reduced motion is respected.
- Errors link to invalid fields.

---

## 29. Final Competition Flow

```mermaid
journey
    title VensaOS competition experience
    section Reporter
      Opens one feedback link: 5: Reporter
      Describes a problem: 5: Reporter
      Adds a screenshot: 4: Reporter
      Submits without an account: 5: Reporter
    section Base44 backend
      Validates and stores report: 5: System
      Classifies the feedback: 5: System
      Finds related issues: 5: System
      Groups duplicates and updates priority: 5: System
    section Product owner
      Sees live dashboard update: 5: Owner
      Reviews original evidence: 5: Owner
      Confirms or reverses grouping: 5: Owner
      Resolves the issue: 5: Owner
    section Reporter follow-up
      Tracks status privately: 5: Reporter
      Receives the resolution: 5: Reporter
```

---

## 30. Start Here

Implementation should begin with:

1. `Project`
2. `FeedbackSubmission`
3. `Issue`
4. `IssueReport`
5. `ActivityEvent`
6. `ReporterAccess`
7. `submit-feedback`
8. Public bug form
9. Owner inbox
10. Direct report-to-issue processing

The first milestone is not a landing page.

The first milestone is:

> A real public report enters Base44, becomes an issue, appears in the owner interface, is resolved, and updates a private reporter tracking page.
