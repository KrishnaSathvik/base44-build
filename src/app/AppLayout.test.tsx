import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '@/app/AppLayout';

vi.mock('@/lib/useCurrentUser', () => ({ useCurrentUser: () => ({ user: { email: 'owner@example.test' }, isLoading: false, isAuthenticated: true }) }));
vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: { logout: vi.fn() },
    entities: {
      FeedbackSubmission: { subscribe: vi.fn(() => () => undefined) },
      Issue: { subscribe: vi.fn(() => () => undefined) },
      IssueReport: { subscribe: vi.fn(() => () => undefined) },
      DuplicateSuggestion: { subscribe: vi.fn(() => () => undefined) },
      ReporterMessage: { subscribe: vi.fn(() => () => undefined) },
      ActivityEvent: { subscribe: vi.fn(() => () => undefined) },
    },
  },
}));
vi.mock('@/lib/api',()=>({listMyProjects:vi.fn().mockResolvedValue([]),listMyIssues:vi.fn().mockResolvedValue([]),listMyNotificationDeliveries:vi.fn().mockResolvedValue([])}));

test('uses a full-screen mobile issue detail without primary bottom navigation', () => {
  const queryClient=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/app/issues/issue-1']}><AppLayout /></MemoryRouter></QueryClientProvider>);
  expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'VensaOS' })).toBeVisible();
  expect(screen.getByText('VensaOS workspace')).toBeVisible();
});
