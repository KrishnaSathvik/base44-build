import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { TrackingPage } from '@/pages/TrackingPage';

vi.mock('@/lib/api', () => ({
  accessTrackingPage: vi.fn().mockRejectedValue(new Error('Invalid or unknown tracking link')),
  apiErrorMessage: vi.fn(() => 'Invalid or unknown tracking link'),
}));

test('shows a designed invalid tracking-link state', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/track/bad']}><Routes><Route path="/track/:token" element={<TrackingPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByRole('heading', { name: 'This tracking link is not valid' })).toBeVisible();
});
