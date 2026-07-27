import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { deliveryIndicator, OwnerIssueDetailPage } from '@/pages/OwnerIssueDetailPage';
import { getActivityForIssue, getIssue, getReporterMessagesForIssue, getReportsForIssue, getSubmission, listMyIssues, reviewGrouping } from '@/lib/api';

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Issue: { subscribe: vi.fn(() => () => undefined) },
      ReporterMessage: { subscribe: vi.fn(() => () => undefined) },
      ActivityEvent: { subscribe: vi.fn(() => () => undefined) },
    },
  },
}));

vi.mock('@/lib/api', () => ({
  getIssue: vi.fn(),
  getReportsForIssue: vi.fn(),
  getActivityForIssue: vi.fn(),
  listMyIssues: vi.fn(),
  getReporterMessagesForIssue: vi.fn().mockResolvedValue([]),
  getAttachmentAccess: vi.fn(),
  getAttachmentsForSubmission: vi.fn().mockResolvedValue([]),
  getSubmission: vi.fn(),
  markOwnerMessagesRead: vi.fn(),
  updateIssueStatus: vi.fn(),
  reviewGrouping: vi.fn(),
  listMyNotificationDeliveries: vi.fn().mockResolvedValue([]),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/issues/issue-1']}>
        <Routes>
          <Route path="/app/issues/:issueId" element={<OwnerIssueDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getIssue).mockResolvedValue({
    id: 'issue-1',
    project_id: 'p1',
    owner_id: 'owner',
    public_code: 'FI-DETAIL',
    title: 'CSV export button does nothing',
    description: 'Export never starts after choosing CSV.',
    status: 'open',
    severity: 'high',
    category: 'functionality',
    product_area: 'Export',
    reproducibility: 'likely',
    core_workflow_blocked: true,
    report_count: 1,
    affected_user_count: 1,
    priority_score: 64,
    priority_explanation: ['High severity', 'Core workflow blocked'],
  } as never);
  vi.mocked(getReportsForIssue).mockResolvedValue([{
    id: 'link-1',
    issue_id: 'issue-1',
    submission_id: 'sub-1',
    grouping_method: 'automatic',
    review_status: 'accepted',
    similarity_score: 0.91,
    matching_reasons: ['Same export failure'],
    conflicting_evidence: ['Different browser'],
  } as never]);
  vi.mocked(getSubmission).mockResolvedValue({
    id: 'sub-1',
    project_id: 'p1',
    owner_id: 'owner',
    type: 'bug',
    description: 'The export button does nothing after I select CSV.',
    processing_status: 'completed',
    ai_category: 'functionality',
    ai_product_area: 'Export',
    ai_severity: 'high',
    ai_keywords: ['export', 'csv'],
    ai_reproducibility: 'likely',
    ai_core_workflow_blocked: true,
    ai_confidence: 0.91,
    ai_analysis_mode: 'ai',
    ai_severity_reasons: ['Export action fails'],
  } as never);
  vi.mocked(getActivityForIssue).mockResolvedValue([]);
  vi.mocked(listMyIssues).mockResolvedValue([]);
  vi.mocked(reviewGrouping).mockResolvedValue();
});

test('shows how VensaOS understood the issue including analysis mode and grouping conflict', async () => {
  renderPage();
  expect(await screen.findByText('How VensaOS understood this')).toBeVisible();
  expect(screen.getByText('AI analysis')).toBeVisible();
  expect(screen.getByText('functionality')).toBeVisible();
  expect(screen.getByText('Export')).toBeVisible();
  expect(screen.getByText('Blocked')).toBeVisible();
  expect(screen.getByText('91%')).toBeVisible();
  expect(screen.getByText('Grouping evidence · 91%')).toBeVisible();
  expect(screen.getByText('Same export failure')).toBeVisible();
  expect(screen.getByText('Different browser')).toBeVisible();
});

test('labels deterministic fallback instead of AI analysis', async () => {
  vi.mocked(getSubmission).mockResolvedValue({
    id: 'sub-1',
    project_id: 'p1',
    owner_id: 'owner',
    type: 'bug',
    description: 'Fallback report',
    processing_status: 'completed',
    ai_category: 'performance',
    ai_product_area: 'Dashboard',
    ai_severity: 'medium',
    ai_confidence: 0.42,
    ai_analysis_mode: 'deterministic_fallback',
  } as never);
  renderPage();
  expect(await screen.findByText('Deterministic fallback')).toBeVisible();
  expect(screen.queryByText('AI analysis')).toBeNull();
});

test('owner can submit a classification correction', async () => {
  renderPage();
  expect(await screen.findByText('Save classification correction')).toBeVisible();
  fireEvent.change(screen.getByDisplayValue('High'), { target: { value: 'medium' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save classification correction' }));
  await waitFor(() => expect(reviewGrouping).toHaveBeenCalledWith(expect.objectContaining({
    action: 'correct_classification',
    issueId: 'issue-1',
    severity: 'medium',
  })));
});

test('distinguishes public, internal, and unread reporter messages', async () => {
  vi.mocked(getReporterMessagesForIssue).mockResolvedValue([
    { id: 'public', project_id: 'p1', owner_id: 'owner', submission_id: 's1', issue_id: 'issue-1', sender_type: 'owner', message_type: 'public_update', body: 'Reporter-visible update', visibility: 'public', is_read_by_owner: true },
    { id: 'internal', project_id: 'p1', owner_id: 'owner', submission_id: 's1', issue_id: 'issue-1', sender_type: 'owner', message_type: 'public_update', body: 'Owner-only investigation', visibility: 'internal', is_read_by_owner: true },
    { id: 'reply', project_id: 'p1', owner_id: 'owner', submission_id: 's1', issue_id: 'issue-1', sender_type: 'reporter', message_type: 'reporter_follow_up', body: 'Unread reply', visibility: 'public', is_read_by_owner: false },
  ] as never);
  renderPage();
  expect(await screen.findByText('Reporter-visible update')).toBeVisible();
  expect(screen.getByText('Owner-only investigation')).toBeVisible();
  expect(screen.getByText('Unread reply')).toBeVisible();
});
test('maps restrained issue delivery indicators', () => {
  expect(deliveryIndicator('pending')).toBe('Email queued');
  expect(deliveryIndicator('sent')).toBe('Email sent');
  expect(deliveryIndicator('failed')).toBe('Email failed');
  expect(deliveryIndicator('skipped', 'preference_disabled')).toBe('Reporter did not opt in');
});
