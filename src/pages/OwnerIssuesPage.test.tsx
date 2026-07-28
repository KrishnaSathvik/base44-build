import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { OwnerIssuesPage } from '@/pages/OwnerIssuesPage';
import { listMyIssues, listMyProjects } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  listMyIssues: vi.fn().mockResolvedValue([]),
  listMyProjects: vi.fn().mockResolvedValue([{ id: 'p1', name: 'TrailVerse', slug: 'trailverse' }]),
}));
vi.mock('@/api/base44Client', () => ({
  base44: { entities: { Issue: { subscribe: vi.fn(() => () => undefined) } } },
}));

test('shows an intentional empty issue state', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/issues']}>
        <OwnerIssuesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('heading', { name: 'No issues yet' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Copy feedback link' })).not.toBeInTheDocument();
});

test('shows onboarding when no project exists', async () => {
  vi.mocked(listMyProjects).mockResolvedValueOnce([]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/issues']}>
        <OwnerIssuesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('heading', { name: 'Create your first feedback board' })).toBeVisible();
});

test('does not expose a non-functional filter control on the issues header', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/issues']}>
        <OwnerIssuesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('heading', { name: 'Issues' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'New project' })).toBeVisible();
});

test('allows long issue titles to wrap on mobile rows', async () => {
  vi.mocked(listMyIssues).mockResolvedValueOnce([
    {
      id: 'issue-1',
      project_id: 'p1',
      public_code: 'FI-LONG01',
      title:
        'A very long issue title that must remain readable on a narrow mobile viewport without overlapping metadata',
      status: 'open',
      severity: 'medium',
      report_count: 1,
      affected_user_count: 1,
    } as never,
  ]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/issues']}>
        <OwnerIssuesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const title = await screen.findByText(/A very long issue title/);
  expect(title).toHaveClass('line-clamp-2');
  expect(title).not.toHaveClass('truncate');
});
