import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { NotificationMenu, visibleOwnerNotifications } from '@/components/NotificationMenu';
import { listMyNotificationDeliveries } from '@/lib/api';
import type { NotificationDelivery } from '@/lib/types';

vi.mock('@/lib/api', () => ({
  listMyNotificationDeliveries: vi.fn().mockResolvedValue([]),
}));

function renderMenu() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <div className="fixed top-0 right-0 h-16">
          <NotificationMenu />
        </div>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('opens the notification panel below the bell instead of clipping above the header', async () => {
  renderMenu();
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  const dialog = await screen.findByRole('dialog', { name: 'Notifications' });
  expect(dialog).toBeVisible();
  expect(dialog.className).toContain('top-[calc(100%+0.5rem)]');
  expect(await screen.findByText('No alerts right now')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open inbox' })).toHaveAttribute('href', '/app/inbox');
});

test('hides skipped reporter deliveries from the owner notification list', async () => {
  vi.mocked(listMyNotificationDeliveries).mockResolvedValueOnce([
    {
      id: 'd1',
      project_id: 'p1',
      owner_id: 'owner@test.dev',
      recipient_type: 'reporter',
      template_key: 'reporter_status_update',
      channel: 'email',
      dedupe_key: 'one',
      status: 'skipped',
      created_at: '2026-07-27T10:00:00Z',
    },
    {
      id: 'd2',
      project_id: 'p1',
      owner_id: 'owner@test.dev',
      recipient_type: 'owner',
      template_key: 'owner_critical_issue',
      channel: 'email',
      dedupe_key: 'two',
      status: 'failed',
      last_error_message: 'Provider unavailable',
      created_at: '2026-07-27T10:00:00Z',
    },
  ]);
  renderMenu();
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(await screen.findByText('Critical issue alert')).toBeVisible();
  expect(screen.queryByText('Status update')).not.toBeInTheDocument();
  expect(screen.getByText('failed')).toBeVisible();
  await waitFor(() => expect(screen.getByText(/need attention/i)).toBeVisible());
});

test('visibleOwnerNotifications drops skipped and reporter rows', () => {
  const rows = [
    { id: '1', recipient_type: 'reporter', status: 'skipped', template_key: 'reporter_status_update' },
    { id: '2', recipient_type: 'owner', status: 'skipped', template_key: 'owner_critical_issue' },
    { id: '3', recipient_type: 'owner', status: 'sent', template_key: 'owner_reporter_reply' },
  ] as NotificationDelivery[];
  expect(visibleOwnerNotifications(rows).map((item) => item.id)).toEqual(['3']);
});
