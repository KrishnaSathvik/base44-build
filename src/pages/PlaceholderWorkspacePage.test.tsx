import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { PlaceholderWorkspacePage } from '@/pages/PlaceholderWorkspacePage';
import { listMyNotificationDeliveries, retryNotification, runFreeMaintenance, updateProjectSettings } from '@/lib/api';

vi.mock('@/lib/appUrls',()=>({publicBoardUrl:vi.fn(()=> 'https://vensaos.com/f/acme')}));

vi.mock('@/lib/api', () => ({
  listMyProjects: vi.fn().mockResolvedValue([{ id:'p1', name:'Acme', slug:'acme', product_url:'https://acme.test', description:'Product feedback', allow_anonymous:true, feedback_types_enabled:['bug','feature','general'], collect_reporter_email:true }]),
  updateProjectSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
  listMyNotificationDeliveries: vi.fn().mockResolvedValue([]), retryNotification:vi.fn(),
  listMyAttachments:vi.fn().mockResolvedValue([]),listMySubmissions:vi.fn().mockResolvedValue([]),
  runFreeMaintenance: vi.fn().mockResolvedValue({ success:true, status:'ran', processed:2, sent:0, failed:0, skipped:2, deadLettered:0, reconciled:0, digestsQueued:0, digestsSkippedEmpty:0, digestsDuplicate:0, projectsChecked:1, orphanAttachments:0, emailDeliveryDisabled:true, lastAttemptAt:'2026-07-27T15:00:00Z', lastSuccessAt:'2026-07-27T15:00:01Z' }),
}));

test('renders editable persisted project settings', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/app/settings']}><PlaceholderWorkspacePage /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByLabelText('Product name')).toHaveValue('Acme');
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled();
  expect(screen.getByText('Email delivery is currently disabled. Notifications will be recorded but not sent.')).toBeVisible();
  expect(screen.getByLabelText('Critical issue alerts')).toBeChecked();
  expect(screen.getByLabelText('Digest timezone')).toHaveValue('UTC');
  expect(screen.getByText('https://vensaos.com/f/acme')).toBeVisible();
  expect(screen.getByText(/next becomes active after the configured local hour/i)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Run maintenance now' })).toBeVisible();
  expect(screen.getByText(/Email delivery is disabled — maintenance will not contact SendEmail/i)).toBeVisible();
});

test('manual maintenance button invokes run-free-maintenance with bypass', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/app/settings']}><PlaceholderWorkspacePage /></MemoryRouter></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Run maintenance now' }));
  await waitFor(() => expect(runFreeMaintenance).toHaveBeenCalledWith({ projectId: 'p1', bypassThrottle: true }));
});

test('shows masked delivery history and retries a failed delivery',async()=>{
  vi.mocked(listMyNotificationDeliveries).mockResolvedValue([{id:'delivery-1',project_id:'p1',owner_id:'owner@example.com',recipient_type:'reporter',template_key:'reporter_issue_resolved',channel:'email',dedupe_key:'one',status:'failed',attempt_count:2,last_error_message:'Provider unavailable',created_at:'2026-07-27T10:00:00Z'}]);
  vi.mocked(retryNotification).mockResolvedValue({id:'delivery-1',project_id:'p1',owner_id:'owner@example.com',recipient_type:'reporter',template_key:'reporter_issue_resolved',channel:'email',dedupe_key:'one',status:'pending'});
  const queryClient=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/app/settings']}><PlaceholderWorkspacePage/></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByText('Reporter (address hidden)')).toBeVisible();expect(screen.queryByText('owner@example.com')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry'}));await waitFor(()=>expect(retryNotification).toHaveBeenCalledWith('delivery-1'));
});

test('saves notification preferences with validated digest settings',async()=>{
  vi.mocked(listMyNotificationDeliveries).mockResolvedValue([]);vi.mocked(updateProjectSettings).mockResolvedValue({} as never);
  const queryClient=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/app/settings']}><PlaceholderWorkspacePage/></MemoryRouter></QueryClientProvider>);
  await screen.findByLabelText('Enable email delivery');fireEvent.click(screen.getByLabelText('Enable email delivery'));fireEvent.change(screen.getByLabelText('Digest timezone'),{target:{value:'America/Chicago'}});fireEvent.click(screen.getByRole('button',{name:'Save settings'}));
  await waitFor(()=>expect(updateProjectSettings).toHaveBeenCalledWith('p1',expect.objectContaining({notificationDeliveryEnabled:true,digestTimezone:'America/Chicago',digestHourLocal:9})));
});
