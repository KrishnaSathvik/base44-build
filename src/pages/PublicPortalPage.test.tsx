import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { PublicPortalPage } from '@/pages/PublicPortalPage';
import { NetworkStateProvider } from '@/app/NetworkStateProvider';

vi.mock('@/lib/api', () => ({
  getPublicProject: vi.fn().mockResolvedValue({
    slug: 'acme',
    name: 'Acme',
    description: null,
    productUrl: null,
    allowAnonymous: true,
    feedbackTypesEnabled: ['bug', 'feature', 'general'],
    collectReporterEmail: true,
    isActive: true,
  }),
  submitFeedback: vi.fn(),
  uploadFeedbackAttachment: vi.fn(),
  apiErrorMessage: vi.fn(() => 'Something went wrong'),
}));

function renderPortal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/f/acme']}>
        <Routes>
          <Route path="/f/:projectSlug" element={<PublicPortalPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('opens a unified form with type dropdown instead of separate type pages', async () => {
  renderPortal();
  expect(await screen.findByRole('heading', { name: 'What happened?' })).toBeVisible();
  expect(screen.getByLabelText('Feedback type')).toHaveValue('bug');
  expect(screen.getByLabelText('Describe the problem')).toHaveFocus();
  expect(screen.getByText('Context attached')).toBeVisible();
  expect(screen.getByLabelText('Email me when the product team replies or changes this issue.')).not.toBeChecked();
  expect(screen.getByText('Acme')).toBeVisible();
  expect(screen.getByText('Powered by VensaOS')).toBeVisible();
  expect(
    screen.getByText('Acme').compareDocumentPosition(screen.getByText('Powered by VensaOS')) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: /choose another type/i })).not.toBeInTheDocument();
});

test('updates copy when feedback type changes', async () => {
  renderPortal();
  await screen.findByRole('heading', { name: 'What happened?' });
  fireEvent.change(screen.getByLabelText('Feedback type'), { target: { value: 'feature' } });
  expect(screen.getByRole('heading', { name: 'What would make this better?' })).toBeVisible();
  expect(screen.getByLabelText('Your feedback')).toBeVisible();
  expect(screen.queryByLabelText('What did you expect?')).not.toBeInTheDocument();
});

test('allows browser context and page URL to be removed before submission', async () => {
  renderPortal();
  await screen.findByRole('heading', { name: 'What happened?' });
  fireEvent.click(screen.getByRole('button', { name: 'Remove browser and device context' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove page' }));
  expect(screen.getByText('Browser and device context removed.')).toBeVisible();
  expect(screen.getByText('Page URL removed.')).toBeVisible();
});

test('blocks submission honestly while offline and keeps the deliberate submit control disabled', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <NetworkStateProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/f/acme']}>
          <Routes>
            <Route path="/f/:projectSlug" element={<PublicPortalPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </NetworkStateProvider>,
  );
  await screen.findByRole('heading', { name: 'What happened?' });
  expect(screen.getByRole('button', { name: /send feedback/i })).toBeDisabled();
  expect(screen.getByText(/draft is saved on this device/i)).toBeVisible();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
