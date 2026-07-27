import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { PlaceholderWorkspacePage } from '@/pages/PlaceholderWorkspacePage';

vi.mock('@/lib/api', () => ({
  listMyProjects: vi.fn().mockResolvedValue([{ id:'p1', name:'Acme', slug:'acme', product_url:'https://acme.test', description:'Product feedback', allow_anonymous:true, feedback_types_enabled:['bug','feature','general'], collect_reporter_email:true }]),
  updateProjectSettings: vi.fn(),
}));

test('renders editable persisted project settings', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/app/settings']}><PlaceholderWorkspacePage /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByLabelText('Product name')).toHaveValue('Acme');
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled();
});
