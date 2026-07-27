import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { PublicPortalPage } from '@/pages/PublicPortalPage';

vi.mock('@/lib/api', () => ({
  getPublicProject: vi.fn().mockResolvedValue({ slug:'acme', name:'Acme', description:null, productUrl:null, allowAnonymous:true, feedbackTypesEnabled:['bug','feature','general'], collectReporterEmail:true, isActive:true }),
  submitFeedback: vi.fn(),
  apiErrorMessage: vi.fn(() => 'Something went wrong'),
}));

test('reveals the bug form after selecting report a problem', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/f/acme']}><Routes><Route path="/f/:projectSlug" element={<PublicPortalPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: /report a problem/i }));
  expect(screen.getByRole('heading', { name: 'What happened?' })).toBeVisible();
  expect(screen.getByLabelText('Describe the problem')).toHaveFocus();
});
