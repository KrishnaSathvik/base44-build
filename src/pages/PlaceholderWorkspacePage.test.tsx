import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { PlaceholderWorkspacePage } from '@/pages/PlaceholderWorkspacePage';
import { listMyProjects, updateProjectSettings } from '@/lib/api';

vi.mock('@/lib/appUrls', () => ({
  publicBoardUrl: vi.fn((slug: string) => `https://vensaos.com/f/${slug}`),
}));

vi.mock('@/lib/api', () => ({
  listMyProjects: vi.fn().mockResolvedValue([
    {
      id: 'p1',
      name: 'Acme',
      slug: 'acme',
      product_url: 'https://acme.test',
      description: 'Product feedback',
      allow_anonymous: true,
      feedback_types_enabled: ['bug', 'feature', 'general'],
      collect_reporter_email: true,
    },
    {
      id: 'p2',
      name: 'Groceries',
      slug: 'groceries',
      product_url: 'https://groceries.test',
      description: 'Shopping lists',
      allow_anonymous: true,
      feedback_types_enabled: ['bug', 'feature', 'general'],
      collect_reporter_email: true,
    },
  ]),
  updateProjectSettings: vi.fn(),
}));

function renderSettings() {
  localStorage.removeItem('vensaos.activeProjectId');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/settings']}>
        <PlaceholderWorkspacePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('renders editable project identity and hides operational clutter', async () => {
  renderSettings();
  expect(await screen.findByLabelText('Product name')).toHaveValue('Acme');
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled();
  expect(screen.getByText('https://vensaos.com/f/acme')).toBeVisible();
  expect(screen.getByLabelText('Project')).toBeVisible();
  expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument();
  expect(screen.queryByText(/Email delivery/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Feedback types/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Allow anonymous/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Free-runtime maintenance/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Orphan evidence/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Delivery history/i)).not.toBeInTheDocument();
});

test('switches the active project and loads its settings', async () => {
  renderSettings();
  await screen.findByLabelText('Product name');
  fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p2' } });
  await waitFor(() => expect(screen.getByLabelText('Product name')).toHaveValue('Groceries'));
  expect(screen.getByText('https://vensaos.com/f/groceries')).toBeVisible();
});

test('saves identity fields for the active project', async () => {
  vi.mocked(updateProjectSettings).mockResolvedValue({} as never);
  renderSettings();
  await screen.findByLabelText('Product name');
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Acme Labs' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  await waitFor(() =>
    expect(updateProjectSettings).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ name: 'Acme Labs' }),
    ),
  );
});

test('shows onboarding when no projects exist', async () => {
  vi.mocked(listMyProjects).mockResolvedValueOnce([]);
  renderSettings();
  expect(await screen.findByRole('heading', { name: 'Create your first feedback board' })).toBeVisible();
});
