# Feedback Inbox
## Design References and Visual Direction

**Document:** 2 of 3  
**Status:** Design source of truth  
**Last updated:** July 22, 2026

---

## 1. Design Goal

Feedback Inbox should feel like a premium editorial evidence workspace where messy user feedback becomes clear product intelligence.

It must not resemble:

- a generic admin template;
- Jira or a miniature project-management suite;
- a colorful consumer feedback wall;
- a chatbot with a dashboard attached;
- an AI product covered in gradients and sparkles;
- a dense spreadsheet with too many controls; or
- a glassmorphism-heavy concept design.

### Design statement

> Raw feedback enters as human language and screenshots. The interface turns it into structured evidence, impact, and action.

### Experience qualities

- Calm
- Precise
- Editorial
- Technical
- Trustworthy
- Evidence-first
- Responsive
- Fast
- Restrained
- Modern without chasing visual trends

---

## 2. Combined Reference Direction

The approved visual combination is:

> **Delphi structure + Dimension workspace + Cursor Evals evidence + Tubik whitespace + Paper.design interaction precision + Way of Code technical language**

These are references, not templates to copy.

| Reference direction | Use in Feedback Inbox |
|---|---|
| Delphi | Strong hierarchy, editorial composition, confident typography |
| Dimension | Product workspace shell, navigation, focused multi-panel work |
| Cursor Evals | Evidence presentation, findings, confidence, traceability |
| Tubik | Generous whitespace, calm layout, visual breathing room |
| Paper.design | Precise interactions, upload flow, polished microstates |
| Way of Code | Monospace metadata, processing language, system transparency |

---

## 3. Design Principles

### 3.1 Evidence before decoration

Screenshots, source quotes, report counts, environments, and activity history are primary content. Decoration must never compete with evidence.

### 3.2 Hierarchy before cards

Do not solve every layout problem with another rounded card. Use:

- page structure;
- sections;
- dividers;
- typography;
- alignment; and
- whitespace.

### 3.3 AI must be visible but not theatrical

The system should show:

- what it inferred;
- why it grouped reports;
- its confidence;
- which signals matched; and
- how the owner can override it.

Avoid:

- glowing AI borders;
- magic wands everywhere;
- animated gradient orbs;
- anthropomorphic AI assistants; and
- claims that the AI “knows” something with certainty.

### 3.4 Severity is not branding

Critical red is a semantic signal, not the dominant brand color.

### 3.5 Mobile is not compressed desktop

The owner dashboard changes structure on mobile. The reporter portal is mobile-first.

### 3.6 Technical details should feel understandable

Use plain language first, with compact technical metadata as supporting evidence.

---

## 4. Visual Identity

### 4.1 Core palette

| Token | Hex | Purpose |
|---|---|---|
| `canvas` | `#F6F5F1` | Warm paper background |
| `surface` | `#FFFFFF` | Main panels and sheets |
| `surface-subtle` | `#F0EFEA` | Secondary sections |
| `ink` | `#151515` | Primary text and primary action |
| `ink-muted` | `#6D6D68` | Secondary text |
| `ink-faint` | `#92928C` | Timestamps and low-emphasis metadata |
| `border` | `#DDDCD6` | Standard hairline border |
| `border-strong` | `#BEBDB6` | Active dividers and focused regions |
| `critical` | `#EF3E3E` | Critical severity and annotation |
| `critical-soft` | `#FFF0EE` | Critical background |
| `warning` | `#A76008` | Needs review or medium confidence |
| `warning-soft` | `#FFF6E8` | Warning background |
| `success` | `#237A4B` | Resolved |
| `success-soft` | `#EBF7F0` | Resolved background |
| `info` | `#315E8C` | Informational state |
| `info-soft` | `#EDF4FA` | Informational background |

### 4.2 Dark mode — token-ready, post-MVP

| Token | Suggested value |
|---|---|
| Canvas | `#151513` |
| Surface | `#1E1E1B` |
| Surface subtle | `#262622` |
| Ink | `#F4F3EE` |
| Ink muted | `#B5B4AD` |
| Border | `#3A3A35` |

Do not implement dark mode during the competition unless all core flows are already stable.

### 4.3 Color rules

- Primary CTA: black background with warm-white text.
- Secondary CTA: white or transparent with hairline border.
- Critical red: only for critical severity, destructive actions, or evidence annotations.
- Use semantic tinted backgrounds sparingly.
- Do not give every category a different saturated color.
- Status should remain legible without color through text and iconography.

---

## 5. Typography

### Recommended stack

- **Display and headings:** Space Grotesk
- **Body and UI:** Inter
- **Technical metadata:** IBM Plex Mono

```css
--font-display: "Space Grotesk", "Inter", system-ui, sans-serif;
--font-body: "Inter", system-ui, sans-serif;
--font-mono: "IBM Plex Mono", ui-monospace, monospace;
```

### Type scale

| Style | Desktop | Mobile | Usage |
|---|---:|---:|---|
| Display | 56–72px | 40–48px | Landing hero only |
| Page title | 36–44px | 30–36px | Dashboard and issue title |
| Section title | 24–28px | 22–24px | Major sections |
| Card title | 17–20px | 17–19px | Report and issue titles |
| Body | 15–17px | 16px | Standard copy |
| Small | 13–14px | 14px | Supporting copy |
| Metadata | 11–12px | 12px | Mono labels and timestamps |

### Typography behavior

- Use sentence case.
- Avoid all caps for long labels.
- Uppercase monospace is acceptable for short metadata:
  - `HIGH`
  - `SAFARI 18`
  - `3 REPORTS`
  - `PROCESSING`
- Use tighter tracking for display headings.
- Use comfortable line height for source quotes.
- Do not use bold everywhere; rely on size and hierarchy.

---

## 6. Layout System

### 6.1 Grid

Desktop:

- Marketing max width: 1280px
- Owner workspace: full viewport
- Left rail: 220–248px
- Center queue: flexible, minimum 420px
- Right evidence panel: 360–440px
- Standard content padding: 24–32px

Tablet:

- Collapsible rail
- Main list plus overlay detail panel

Mobile:

- Single column
- 16px side padding
- Bottom navigation
- Full-screen detail routes
- Sticky primary actions where needed

### 6.2 Spacing

Use a 4px base scale:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
```

Default section rhythm:

- 24px inside compact panels
- 32px around major workspace regions
- 64–96px between marketing sections

### 6.3 Shape

- Standard radius: 8px
- Small control radius: 6px
- Large sheet radius: 12px
- Pills only for tags, filters, and statuses
- Avoid 20–32px rounded bubble cards
- Use borders instead of heavy shadows

### 6.4 Shadows

Use almost none.

Allowed:

- subtle floating-sheet shadow;
- attachment lightbox;
- mobile bottom sheet; and
- transient dropdown.

Main panels should use borders and canvas contrast.

---

## 7. Product Shell

### Desktop shell

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Feedback Inbox     Project / Environment            Search     User │
├──────────────┬─────────────────────────────────┬────────────────────┤
│ Navigation   │ Working queue                   │ Evidence / detail  │
│              │                                 │                    │
│ Overview     │ Reports or issues               │ Selected record    │
│ Inbox        │                                 │                    │
│ Issues       │                                 │                    │
│ Resolved     │                                 │                    │
│              │                                 │                    │
│ Settings     │                                 │                    │
└──────────────┴─────────────────────────────────┴────────────────────┘
```

### Shell rules

- Keep global navigation fixed.
- Let the list scroll independently from detail when useful.
- Maintain selected-row context.
- Do not use modal windows for routine issue inspection.
- Use a URL route for every meaningful owner state so reloads work.
- Let the evidence panel collapse on narrower screens.

### Mobile shell

Bottom navigation:

- Overview
- Inbox
- Issues
- Settings

The issue detail is a full-screen route with a back action.

---

## 8. Landing Page Direction

### 8.1 Hero

Left:

> **Feedback should tell you what to fix next.**

Supporting copy:

> Collect reports through one simple link. Group repeated problems, preserve the evidence, and understand what is affecting users most.

Actions:

- `Create a feedback board`
- `View demo`

Right:

A visual transformation from three raw reports into one structured issue.

```text
“My message is centered.”
“There is too much side space.”
“Chat width looks wrong on iPhone.”

                    ↓

Chat message container width
3 reports · High priority
```

### 8.2 Landing page sequence

1. Hero
2. Raw feedback becomes one issue
3. Three-step explanation
4. Evidence and duplicate explanation preview
5. Public reporter-form preview
6. Final CTA

Avoid:

- twelve-card feature grids;
- fake company logos;
- pricing during the competition;
- generic “AI-powered” marketing;
- testimonial placeholders; and
- enormous footer navigation.

---

## 9. Public Feedback Portal Direction

The public portal should be visually simpler than the owner workspace.

### Entry screen

- Product logo
- Product name
- One-line invitation
- Three large options:
  - Report a problem
  - Suggest an improvement
  - Share feedback

### Form

Start with one question:

> **What happened?**

Reveal supporting fields progressively.

### Screenshot uploader

Desktop:

- drag and drop;
- paste from clipboard;
- click to browse; and
- preview before submission.

Mobile:

- take photo;
- choose from library;
- clear progress state; and
- remove action.

### Captured-context block

```text
CONTEXT ATTACHED

Safari 18
iPhone
390 × 844
/trailie/chat

Remove page URL
```

Use IBM Plex Mono and a quiet outlined container.

### Trust note

> Device and page context help reproduce the issue. You can remove optional details before submitting.

---

## 10. Feedback Inbox Direction

Each row should feel like a concise finding, not a spreadsheet record.

### Report row anatomy

1. Severity marker
2. Short normalized title
3. One- or two-line source summary
4. Product area and environment
5. Time
6. Screenshot indicator
7. Duplicate suggestion
8. Review state

Example:

```text
HIGH                                               12 MIN AGO

Outgoing chat messages leave excessive side spacing

User reports that message bubbles remain narrow on mobile Safari,
leaving unused space across the chat screen.

CHAT · IPHONE · SAFARI 18 · SCREENSHOT

Possible match: Chat message container width · 91%
```

### Row interactions

Desktop:

- click selects;
- keyboard arrows move selection;
- hover reveals quick actions;
- optional documented shortcuts only.

Mobile:

- tap opens;
- swipe may expose Review and Dismiss; and
- no hidden destructive action without confirmation.

---

## 11. Issue Detail Direction

This is the competition hero screen.

### Header

```text
ISSUE FI-7K2M9A                                  IN PROGRESS

Chat messages use incorrect width on mobile

8 reports · 7 affected users · First seen 42 minutes ago
```

### Sections

1. Executive summary
2. What users are reporting
3. Why reports were grouped
4. Environment breakdown
5. Attachments
6. Original reports
7. Activity timeline
8. Resolution controls

### Why-grouped block

```text
WHY THESE REPORTS WERE GROUPED

Same product area      Chat
Same page              /trailie/chat
Shared concepts        width, spacing, message container
Platform overlap       mobile Safari
Confidence             91%

Review grouping   Separate reports
```

The confidence number should never be the only explanation.

### Quotes

Use source quotes with clear quotation marks and reporter anonymity.

> “Messages appear in the center with too much empty space.”

Do not rewrite every quote into polished language.

### Activity timeline

```text
20:42:03  Report received
20:42:04  Classified as UI/UX
20:42:04  Similar issue detected
20:42:05  Attached to FI-7K2M9A
20:42:05  Priority increased 64 → 72
```

Use IBM Plex Mono and restrained vertical rules.

---

## 12. Overview Dashboard Direction

The overview should answer:

> What needs attention today?

### Hero summary

> **Three issues need attention.**

> Twelve new reports arrived across two projects today.

### Priority list

Use numbered editorial blocks, not a grid of KPI cards.

```text
01  Login fails after form submission
    Critical · 3 reports in 20 minutes

02  Chat messages use incorrect mobile width
    High · 8 affected users

03  Weather cards load slowly
    Medium · 4 reports
```

### Live processing

```text
LIVE PROCESSING

20:42:05  3 reports grouped into FI-7K2M9A
20:40:18  Critical alert sent for FI-3H8QZ4
20:36:52  Feature request created
```

Do not build decorative charts for the MVP.

---

## 13. Components

### Core primitives

- Button
- Icon button
- Text input
- Textarea
- Select
- Checkbox
- Switch
- Segmented control
- Status tag
- Severity marker
- Filter chip
- Tooltip
- Dropdown
- Dialog
- Sheet
- Toast
- Skeleton
- Inline error
- Empty state
- File uploader

### Product components

- Project switcher
- Feedback-type selector
- Report row
- Issue row
- Evidence quote
- Grouping explanation
- Similarity indicator
- Priority explanation
- Environment breakdown
- Attachment gallery
- Activity timeline
- Reporter status card
- Live-processing stream
- Public-context disclosure
- Tracking-link card

---

## 14. Status and Severity Language

### Severity

- Critical
- High
- Medium
- Low

### Status

- Processing
- Unreviewed
- Needs info
- Open
- Planned
- In progress
- Testing
- Resolved
- Reopened
- Duplicate
- Dismissed

### Tone

Prefer direct language:

- `Needs review`
- `Possible duplicate`
- `Grouped automatically`
- `Processing failed`
- `Retry processing`
- `Resolved for reporters`

Avoid:

- `AI magic complete`
- `Smart merge`
- `Confidence unlocked`
- `Optimized successfully`

---

## 15. Motion

### Useful motion

- A new report enters the queue.
- Related-report count increments.
- Priority score changes.
- Three reports visually converge into one issue during the demo.
- A status tag transitions.
- A screenshot opens in context.
- The live indicator pulses gently.
- Copy-link confirmation appears inline.

### Motion rules

- 120–180ms for small state changes
- 180–260ms for panels
- Respect reduced-motion preference
- No springy bounce for serious workflows
- No continuous decorative animation

---

## 16. Loading States

### Public form

- File upload progress
- Securing attachment
- Submitting report
- Creating tracking link

Do not show AI classification before reporter confirmation is complete.

### Owner dashboard

- List skeletons that match final rows
- Detail-panel skeleton
- Processing state within a new report
- Inline retry if processing fails
- Realtime reconnect banner only when necessary

---

## 17. Empty States

### No feedback

> **No feedback yet**

> Share your public link with testers to receive your first report.

Actions:

- Copy feedback link
- Submit test report

### Inbox clear

> **Everything has been reviewed**

> New reports and duplicate suggestions will appear here.

### No critical issues

> **Nothing urgent right now**

> Critical reports will be surfaced here automatically.

### No screenshots

> **No attachments**

> This report was submitted without a screenshot.

Avoid cartoon illustrations unless extremely restrained.

---

## 18. Error States

Public:

- Invalid project link
- Project not accepting reports
- File too large
- Unsupported file type
- Submission rate limited
- Network lost
- Submission failed but draft preserved

Owner:

- Processing failed
- Realtime disconnected
- Signed attachment link expired
- Unauthorized project
- Duplicate operation conflict
- Report already moved

Errors must explain the next action.

---

## 19. Accessibility

- WCAG AA contrast minimum
- Visible focus states
- Semantic headings
- Labels, not placeholders
- Keyboard-accessible list and detail
- Screen-reader status announcements
- `aria-live` for new realtime items
- Reduced-motion support
- 44px mobile targets
- Do not convey severity using color alone
- Attachment descriptions when available
- Error summaries linked to fields

---

## 20. Responsive Breakpoints

```text
Mobile:   < 768px
Tablet:   768–1099px
Desktop:  ≥ 1100px
Wide:     ≥ 1440px
```

### Mobile

- Single-column public form
- Bottom owner navigation
- Full-screen issue detail
- Sticky submit/status controls
- Bottom sheets

### Tablet

- Collapsible rail
- List plus slide-over detail
- Two-column public form only when comfortable

### Desktop

- Persistent left rail
- List and evidence side by side
- Optional three-panel workspace on wide screens

---

## 21. Design Tokens

```css
:root {
  --color-canvas: #f6f5f1;
  --color-surface: #ffffff;
  --color-surface-subtle: #f0efea;
  --color-ink: #151515;
  --color-ink-muted: #6d6d68;
  --color-ink-faint: #92928c;
  --color-border: #dddcd6;
  --color-border-strong: #bebdb6;
  --color-critical: #ef3e3e;
  --color-critical-soft: #fff0ee;
  --color-warning: #a76008;
  --color-warning-soft: #fff6e8;
  --color-success: #237a4b;
  --color-success-soft: #ebf7f0;
  --color-info: #315e8c;
  --color-info-soft: #edf4fa;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

---

## 22. Design QA Checklist

Before accepting a screen:

- Does it have one clear primary task?
- Is source evidence visible?
- Can the user distinguish report from issue?
- Is AI reasoning explainable?
- Are red and warning colors semantic?
- Is the screen usable without animation?
- Does mobile use the correct structure?
- Are loading and failure states defined?
- Are controls keyboard accessible?
- Can the user find the next action in five seconds?
- Is there unnecessary dashboard decoration?
- Could one card or panel be removed?
- Does the design feel calm under heavy data?

---

## 23. Design Scope Lock

Prioritize these polished surfaces:

1. Landing hero and product explanation
2. Public feedback entry
3. Public feedback form
4. Submission confirmation
5. Owner overview
6. Feedback inbox
7. Issue detail with grouping explanation
8. Reporter tracking page
9. Project setup and public-link settings
10. Mobile versions of public form, inbox, and issue detail

Do not spend competition time on:

- complex analytics;
- billing;
- public roadmap;
- theme marketplace;
- excessive onboarding;
- empty marketing pages; or
- decorative animation.

---

## 24. Final Visual Definition

> Feedback Inbox is a warm, paper-toned, evidence-first product workspace with strong typography, white working surfaces, black primary actions, architectural red annotations, hairline borders, restrained motion, and precise technical metadata.

Every design decision should help users move from:

```text
Raw report → Shared pattern → Evidence → Priority → Resolution
```
