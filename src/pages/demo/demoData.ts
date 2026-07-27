export type DemoView = 'overview' | 'inbox' | 'issue' | 'duplicate' | 'priority' | 'reporter' | 'reopen';

export const DEMO_STEPS = [
  { id: 1, label: 'Incoming reports', view: 'inbox' as const },
  { id: 2, label: 'VensaOS understands them', view: 'issue' as const },
  { id: 3, label: 'Related reports are connected', view: 'issue' as const },
  { id: 4, label: 'The owner investigates', view: 'issue' as const },
  { id: 5, label: 'The reporter confirms the result', view: 'reporter' as const },
] as const;

export const DEMO_ISSUE = {
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

export const DEMO_DUPLICATE = {
  publicCode: 'FI-DEMO02',
  title: 'Weather timeline is slow on older phones',
  confidence: 72,
  reason: 'Different product area and symptoms—kept as a suggestion for owner review, not auto-merged.',
};

export const DEMO_MESSAGES = [
  { from: 'owner' as const, body: 'Thanks for reporting this. Which viewport width were you using when the composer covered the newest message?', time: '2 hours ago' },
  { from: 'reporter' as const, body: 'iPhone 14, portrait. Happens as soon as the keyboard opens.', time: '1 hour ago' },
  { from: 'owner' as const, body: 'We raised the composer above the keyboard safe area. Please confirm whether new messages stay visible.', time: '35 min ago' },
];

export const DEMO_ACTIVITY = [
  { body: 'Three related reports grouped into FI-DEMO01', time: 'Yesterday' },
  { body: 'Owner requested more information', time: '2 hours ago' },
  { body: 'Reporter replied with viewport details', time: '1 hour ago' },
  { body: 'Status moved to testing', time: '35 min ago' },
];
