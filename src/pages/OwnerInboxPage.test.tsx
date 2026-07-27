import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { OwnerInboxPage } from '@/pages/OwnerInboxPage';
import { listMyAttachments, listMyDuplicateSuggestions, listMyIssueReports, listMyIssues, listMySubmissions, processFeedback, reviewGrouping } from '@/lib/api';

vi.mock('@/api/base44Client', () => ({
  base44: { entities: {
    FeedbackSubmission: { subscribe: vi.fn(() => () => undefined) }, Issue: { subscribe: vi.fn(() => () => undefined) },
    IssueReport: { subscribe: vi.fn(() => () => undefined) }, DuplicateSuggestion: { subscribe: vi.fn(() => () => undefined) },
  } },
}));
vi.mock('@/lib/api', () => ({
  listMySubmissions: vi.fn(), listMyIssues: vi.fn(), listMyIssueReports: vi.fn(), listMyDuplicateSuggestions: vi.fn(),
  listMyAttachments: vi.fn(), getAttachmentAccess: vi.fn(), processFeedback: vi.fn(), reviewGrouping: vi.fn(),
}));

function renderInbox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><OwnerInboxPage /></QueryClientProvider>);
}

test('shows explainable duplicate evidence and accepts a suggestion', async () => {
  vi.mocked(listMyAttachments).mockResolvedValue([]);
  vi.mocked(listMySubmissions).mockResolvedValue([{ id: 'report-1', project_id: 'p1', owner_id: 'owner@test.dev', type: 'bug', description: 'Send button freezes on checkout', processing_status: 'completed', ai_summary: 'Checkout send button freezes', ai_severity: 'high', ai_product_area: 'Checkout', ai_category: 'functionality', ai_confidence: .91 } as never]);
  vi.mocked(listMyIssues).mockResolvedValue([
    { id: 'source', public_code: 'FI-SOURCE', title: 'Checkout send button freezes', status: 'unreviewed', report_count: 1 } as never,
    { id: 'candidate', public_code: 'FI-TARGET', title: 'Checkout form freezes on submit', status: 'open', report_count: 3 } as never,
  ]);
  vi.mocked(listMyIssueReports).mockResolvedValue([{ id: 'link-1', project_id: 'p1', owner_id: 'owner@test.dev', issue_id: 'source', submission_id: 'report-1', review_status: 'accepted' } as never]);
  vi.mocked(listMyDuplicateSuggestions).mockResolvedValue([{ id: 'suggestion-1', project_id: 'p1', owner_id: 'owner@test.dev', submission_id: 'report-1', source_issue_id: 'source', candidate_issue_id: 'candidate', similarity_score: .76, matching_reasons: ['Same checkout action'], conflicting_evidence: ['Different browser'], status: 'pending' }]);
  vi.mocked(reviewGrouping).mockResolvedValue();
  renderInbox();
  expect((await screen.findAllByText(/FI-TARGET/))[0]).toBeVisible();
  expect(screen.getByText('Same checkout action')).toBeVisible();
  expect(screen.getByText('Different browser')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /accept grouping/i }));
  await waitFor(() => expect(reviewGrouping).toHaveBeenCalledWith({ action: 'accept', suggestionId: 'suggestion-1' }));
});

test('keeps failed evidence reviewable and exposes retry', async () => {
  vi.mocked(listMyAttachments).mockResolvedValue([]);
  vi.mocked(listMySubmissions).mockResolvedValue([{ id: 'report-failed', project_id: 'p1', owner_id: 'owner@test.dev', type: 'general', description: 'Original evidence stays visible', processing_status: 'failed', processing_error: 'Invalid classifier output' } as never]);
  vi.mocked(listMyIssues).mockResolvedValue([]);
  vi.mocked(listMyIssueReports).mockResolvedValue([]);
  vi.mocked(listMyDuplicateSuggestions).mockResolvedValue([]);
  vi.mocked(processFeedback).mockResolvedValue();
  renderInbox();
  expect((await screen.findAllByText('Original evidence stays visible'))[0]).toBeVisible();
  expect(screen.getByText('Invalid classifier output')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(processFeedback).toHaveBeenCalledWith('report-failed', true));
});
