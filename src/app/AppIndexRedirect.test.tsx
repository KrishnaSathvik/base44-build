import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { AppIndexRedirect } from '@/app/AppIndexRedirect';

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { email: 'owner@example.test' }, isLoading: false, isAuthenticated: true }),
}));

const listMyProjects = vi.fn();
vi.mock('@/lib/api', () => ({ listMyProjects: (...args: unknown[]) => listMyProjects(...args) }));

function renderRedirect() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/app" element={<AppIndexRedirect />} />
          <Route path="/app/setup" element={<div>Setup page</div>} />
          <Route path="/app/overview" element={<div>Overview page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('sends signed-in owners without a board to setup', async () => {
  listMyProjects.mockResolvedValueOnce([]);
  renderRedirect();
  await waitFor(() => expect(screen.getByText('Setup page')).toBeVisible());
});

test('sends signed-in owners with a board to overview', async () => {
  listMyProjects.mockResolvedValueOnce([{ id: 'p1', name: 'TrailVerse', slug: 'trailverse' }]);
  renderRedirect();
  await waitFor(() => expect(screen.getByText('Overview page')).toBeVisible());
});
