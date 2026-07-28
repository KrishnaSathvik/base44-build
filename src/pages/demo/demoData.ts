export type DemoView =
  | 'overview'
  | 'inbox'
  | 'issues'
  | 'detail'
  | 'duplicate'
  | 'resolved'
  | 'tracking';

export type DemoSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DemoIssueStatus =
  | 'unreviewed'
  | 'open'
  | 'testing'
  | 'needs_info'
  | 'resolved'
  | 'reopened';

export type DemoInboxReason =
  | 'Possible duplicate'
  | 'Processing failed'
  | 'Needs information'
  | 'Reporter replied';

export interface DemoIssueSummary {
  id: string;
  publicCode: string;
  title: string;
  description: string;
  severity: DemoSeverity;
  status: DemoIssueStatus;
  priorityScore: number;
  reportCount: number;
  affectedUserCount: number;
  lastSeen: string;
  publicResolutionNote?: string;
  resolvedAt?: string;
  confirmationStatus?: 'pending' | 'confirmed' | 'not_fixed';
}

export const DEMO_PRODUCT = 'TrailVerse Demo';

export const DEMO_STEPS = [
  { id: 1, label: 'Overview briefing', view: 'overview' as const },
  { id: 2, label: 'Inbox exceptions', view: 'inbox' as const },
  { id: 3, label: 'Issues queue', view: 'issues' as const },
  { id: 4, label: 'Resolve with a public message', view: 'detail' as const },
  { id: 5, label: 'Reporter confirmation', view: 'tracking' as const },
] as const;

/** Featured walkthrough issue (high). */
export const DEMO_ISSUE = {
  id: 'demo-issue-chat',
  publicCode: 'FI-DEMO01',
  title: 'Mobile chat composer obscures new messages',
  description: 'The keyboard and fixed composer can hide the newest conversation content.',
  severity: 'high' as const,
  status: 'testing' as const,
  priorityScore: 82,
  reportCount: 3,
  affectedUserCount: 3,
  category: 'UI UX',
  productArea: 'Mobile chat',
  reproducibility: 'confirmed',
  coreWorkflow: 'Blocked',
  analysisMethod: 'Base44 managed InvokeLLM',
  confidence: '86%',
  lastSeen: 'Today',
  priorityReasons: [
    'Core conversation workflow blocked',
    'Three related reports',
    'Repeated recent activity',
  ],
  understanding: [
    'Category: UI UX · Product area: Mobile chat',
    'Reproducibility: confirmed · Core workflow: blocked',
    'Matching reasons: same composer occlusion · mobile viewport',
  ],
};

/** Already closed in the fixture so Resolved is never empty. */
export const DEMO_RESOLVED_SEED: DemoIssueSummary = {
  id: 'demo-issue-cache',
  publicCode: 'FI-DEMO00',
  title: 'Offline trail cache not refreshing after sync',
  description: 'Cached trail packs stayed stale until the app was force-quit.',
  severity: 'medium',
  status: 'resolved',
  priorityScore: 61,
  reportCount: 2,
  affectedUserCount: 2,
  lastSeen: '3 days ago',
  publicResolutionNote:
    'We now invalidate offline packs after a successful sync and show a refresh toast.',
  resolvedAt: '2 days ago',
  confirmationStatus: 'confirmed',
};

export const DEMO_OPEN_ISSUES: DemoIssueSummary[] = [
  {
    id: 'demo-issue-checkout',
    publicCode: 'FI-DEMO03',
    title: 'Checkout payment fails when Apple Pay sheet closes',
    description: 'Closing the Apple Pay sheet leaves the order in a stuck pending state.',
    severity: 'critical',
    status: 'open',
    priorityScore: 96,
    reportCount: 4,
    affectedUserCount: 4,
    lastSeen: 'Today',
  },
  {
    id: DEMO_ISSUE.id,
    publicCode: DEMO_ISSUE.publicCode,
    title: DEMO_ISSUE.title,
    description: DEMO_ISSUE.description,
    severity: DEMO_ISSUE.severity,
    status: DEMO_ISSUE.status,
    priorityScore: DEMO_ISSUE.priorityScore,
    reportCount: DEMO_ISSUE.reportCount,
    affectedUserCount: DEMO_ISSUE.affectedUserCount,
    lastSeen: DEMO_ISSUE.lastSeen,
  },
  {
    id: 'demo-issue-weather',
    publicCode: 'FI-DEMO02',
    title: 'Weather timeline is slow on older phones',
    description: 'The forecast timeline takes several seconds to paint on older devices.',
    severity: 'medium',
    status: 'unreviewed',
    priorityScore: 54,
    reportCount: 1,
    affectedUserCount: 1,
    lastSeen: 'Yesterday',
  },
  {
    id: 'demo-issue-map',
    publicCode: 'FI-DEMO04',
    title: 'Map pin colors are hard to distinguish outdoors',
    description: 'Trail pins blend together in bright sunlight on the outdoor map.',
    severity: 'low',
    status: 'unreviewed',
    priorityScore: 28,
    reportCount: 1,
    affectedUserCount: 1,
    lastSeen: '2 days ago',
  },
  {
    id: 'demo-issue-settings',
    publicCode: 'FI-DEMO05',
    title: 'Settings save confirmation is easy to miss',
    description: 'The success toast disappears before hikers notice unit preferences saved.',
    severity: 'low',
    status: 'unreviewed',
    priorityScore: 22,
    reportCount: 1,
    affectedUserCount: 1,
    lastSeen: '4 days ago',
  },
];

/** Alias used by Issues list and Overview attention. */
export const DEMO_ISSUES = DEMO_OPEN_ISSUES;

export const DEMO_ATTENTION_ISSUES = DEMO_OPEN_ISSUES.slice(0, 4);

export interface DemoInboxItem {
  id: string;
  reason: DemoInboxReason;
  typeLabel: string;
  when: string;
  title: string;
  body: string;
  publicCode?: string;
  detail: string;
  meta?: string;
}

export const DEMO_INBOX_ITEMS: DemoInboxItem[] = [
  {
    id: 'inbox-duplicate',
    reason: 'Possible duplicate',
    typeLabel: 'Bug',
    when: 'Today',
    title: 'Weather timeline is slow on older phones',
    body: 'Weather timeline is very slow on my older phone.',
    publicCode: 'FI-DEMO02',
    detail:
      'Different product area and symptoms—kept as a suggestion for owner review, not auto-merged.',
    meta: `72% confidence · suggested against ${DEMO_ISSUE.publicCode}`,
  },
  {
    id: 'inbox-failed',
    reason: 'Processing failed',
    typeLabel: 'Bug',
    when: 'Today',
    title: 'Photo upload crashed mid-submit',
    body: 'I tried to attach a trail photo and the form froze before submit finished.',
    detail:
      'AI classification timed out. Retry processing or open the raw report and create an issue manually.',
    meta: 'Retry available · no issue created yet',
  },
  {
    id: 'inbox-needs-info',
    reason: 'Needs information',
    typeLabel: 'Bug',
    when: 'Yesterday',
    title: 'GPS drift on switchbacks',
    body: 'The blue dot jumps off the trail on steep switchbacks.',
    publicCode: 'FI-DEMO06',
    detail:
      'Owner asked which device and OS build showed the drift. Waiting on the reporter tracking reply.',
    meta: 'Public question sent · awaiting reply',
  },
  {
    id: 'inbox-reply',
    reason: 'Reporter replied',
    typeLabel: 'Bug',
    when: '1 hour ago',
    title: 'Share sheet truncates long trail names',
    body: 'On iOS the share preview cuts off trail names longer than about 40 characters.',
    publicCode: 'FI-DEMO07',
    detail:
      'Reporter replied with a screenshot and the exact trail name that truncates. Review and continue the conversation.',
    meta: 'Unread reporter message',
  },
];

/** @deprecated Prefer DEMO_INBOX_ITEMS[0]; kept for duplicate review pane. */
export const DEMO_DUPLICATE = {
  publicCode: 'FI-DEMO02',
  title: 'Weather timeline is slow on older phones',
  confidence: 72,
  reason:
    'Different product area and symptoms—kept as a suggestion for owner review, not auto-merged.',
  body: 'Weather timeline is very slow on my older phone.',
};

/** Hero / convergence slips — same three reports that group into FI-DEMO01. */
export const DEMO_CONVERGENCE_REPORTS = [
  ['BUG REPORT', 'Chat composer covers the newest message on iPhone.'],
  ['BUG REPORT', 'Keyboard leaves the conversation scrolled above the reply.'],
  ['BUG REPORT', 'Latest chat bubble is hidden behind the mobile composer.'],
] as const;

export const DEMO_REPORTS = [
  {
    id: 'demo-chat-1',
    type: 'Bug report',
    body: 'Chat composer covers the newest message on iPhone.',
    expected: 'Newest message remains visible.',
    device: 'iPhone · iOS · Safari',
    grouping: 'auto-grouped',
    similarity: 94,
  },
  {
    id: 'demo-chat-2',
    type: 'Bug report',
    body: 'Keyboard leaves the conversation scrolled above the reply.',
    expected: 'Conversation follows the latest reply.',
    device: 'Android phone · Chrome',
    grouping: 'auto-grouped',
    similarity: 88,
  },
  {
    id: 'demo-chat-3',
    type: 'Bug report',
    body: 'Latest chat bubble is hidden behind the mobile composer.',
    expected: 'The latest bubble remains above the composer.',
    device: 'iPhone · Safari',
    grouping: 'auto-grouped',
    similarity: 91,
  },
] as const;

export const DEMO_MESSAGES = [
  {
    from: 'owner' as const,
    body: 'Thanks for reporting this. Which viewport width were you using when the composer covered the newest message?',
    time: '2 hours ago',
  },
  {
    from: 'reporter' as const,
    body: 'iPhone 14, portrait. Happens as soon as the keyboard opens.',
    time: '1 hour ago',
  },
  {
    from: 'owner' as const,
    body: 'We raised the composer above the keyboard safe area. Please confirm whether new messages stay visible.',
    time: '35 min ago',
  },
];

export const DEMO_ACTIVITY = [
  { body: 'Three related reports grouped into FI-DEMO01', time: 'Yesterday' },
  { body: 'Owner requested more information', time: '2 hours ago' },
  { body: 'Reporter replied with viewport details', time: '1 hour ago' },
  { body: 'Status moved to testing', time: '35 min ago' },
];

export const DEMO_ENVIRONMENT = {
  browser: 'Safari 18 · iOS',
  device: 'iPhone 14 · portrait',
  screen: '390 × 844',
  viewport: '390 × 664',
  page: '/chat/thread/4821',
} as const;

export const DEMO_RESOLUTION_NOTE =
  'We raised the composer above the keyboard safe area so new messages stay visible.';

export function demoSeverityLabel(severity: DemoSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}
