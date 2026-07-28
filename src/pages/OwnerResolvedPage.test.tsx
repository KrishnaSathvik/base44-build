import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { OwnerResolvedPage } from '@/pages/OwnerResolvedPage';
import { listMyIssues } from '@/lib/api';

vi.mock('@/api/base44Client',()=>({base44:{entities:{Issue:{subscribe:vi.fn(()=>()=>undefined)}}}}));
vi.mock('@/lib/api',()=>({
  listMyIssues:vi.fn(),
  listMyProjects:vi.fn().mockResolvedValue([{id:'p1',name:'TrailVerse',slug:'trailverse'}]),
}));

test('filters resolved confirmation outcomes and keeps reopened explicit', async () => {
  vi.mocked(listMyIssues).mockResolvedValue([
    {
      id: 'confirmed',
      project_id: 'p1',
      owner_id: 'o',
      public_code: 'FI-C',
      title: 'Confirmed issue',
      status: 'resolved',
      resolution_confirmation_status: 'confirmed',
      public_resolution_note: 'Done',
    } as never,
    {
      id: 'pending',
      project_id: 'p1',
      owner_id: 'o',
      public_code: 'FI-P',
      title: 'Pending issue',
      status: 'resolved',
      resolution_confirmation_status: 'pending',
      public_resolution_note: 'Done',
    } as never,
    {
      id: 'reopened',
      project_id: 'p1',
      owner_id: 'o',
      public_code: 'FI-R',
      title: 'Reopened issue',
      status: 'reopened',
      resolution_confirmation_status: 'not_fixed',
      public_resolution_note: 'Attempted',
    } as never,
  ]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OwnerResolvedPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Confirmed issue')).toBeVisible();
  expect(screen.getByText('Pending issue')).toBeVisible();
  expect(screen.queryByText('Reopened issue')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reopened' }));
  expect(await screen.findByText('Reopened issue')).toBeVisible();
  expect(screen.queryByText('Confirmed issue')).not.toBeInTheDocument();
});

test('stacks resolved cards through tablet breakpoints', async () => {
  vi.mocked(listMyIssues).mockResolvedValue([
    {
      id: 'confirmed',
      project_id: 'p1',
      owner_id: 'o',
      public_code: 'FI-C',
      title: 'Confirmed issue with a long title that needs room',
      status: 'resolved',
      resolution_confirmation_status: 'confirmed',
      public_resolution_note: 'Done',
      report_count: 3,
      resolved_at: '2026-07-01T12:00:00.000Z',
    } as never,
  ]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OwnerResolvedPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const row = (await screen.findByText('Confirmed issue with a long title that needs room')).closest('a');
  expect(row).toHaveClass('lg:grid');
  expect(row).not.toHaveClass('sm:grid-cols-[minmax(0,1fr)_140px_150px_90px_auto]');
});
