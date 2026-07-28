import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { PublicPortalPage } from '@/pages/PublicPortalPage';
import { submitFeedback } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  getPublicProject: vi.fn().mockResolvedValue({ slug:'acme', name:'Acme', description:null, productUrl:null, allowAnonymous:true, feedbackTypesEnabled:['bug','feature','general'], collectReporterEmail:true, isActive:true }),
  submitFeedback: vi.fn(),
  uploadFeedbackAttachment: vi.fn(),
  apiErrorMessage: vi.fn(() => 'Something went wrong'),
}));

beforeEach(() => {
  vi.mocked(submitFeedback).mockReset();
});

async function fillAndSubmit() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/f/acme']}><Routes><Route path="/f/:projectSlug" element={<PublicPortalPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  await screen.findByRole('heading', { name: 'What happened?' });
  fireEvent.change(screen.getByLabelText('Describe the problem'), { target: { value: 'Checkout overflows on mobile' } });
  fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
}

test('immediate submission processing result shows tracking and public code', async () => {
  vi.mocked(submitFeedback).mockResolvedValue({
    success: true,
    duplicate: false,
    submissionRef: 'sub-1',
    publicCode: 'FI-1001',
    trackingToken: 'token-1',
    trackingUrl: '/track/token-1',
    processingCompleted: true,
  });
  await fillAndSubmit();
  expect(await screen.findByText('Thanks — your feedback is in')).toBeVisible();
  expect(screen.getByText('FI-1001')).toBeVisible();
  expect(screen.getByText(/\/track\/token-1/)).toBeVisible();
  expect(screen.getByText(/Save this link before you leave/i)).toBeVisible();
  expect(screen.getByText(/no “forgot link” recovery|no "forgot link" recovery/i)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Copy tracking link' })).toBeVisible();
  expect(screen.getByRole('link', { name: /open tracking page/i })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Submit another report' })).toBeVisible();
  expect(screen.queryByText(/Return to product/i)).not.toBeInTheDocument();
});

test('safe accepted response when processing fails still returns tracking', async () => {
  vi.mocked(submitFeedback).mockResolvedValue({
    success: true,
    duplicate: false,
    submissionRef: 'sub-2',
    publicCode: null,
    trackingToken: 'token-2',
    trackingUrl: '/track/token-2',
    processingCompleted: false,
  });
  await fillAndSubmit();
  expect(await screen.findByText('Thanks — your feedback is in')).toBeVisible();
  expect(screen.getByText(/\/track\/token-2/)).toBeVisible();
  expect(screen.queryByText(/processing failed|InvokeLLM|\bAI\b/i)).toBeNull();
});
