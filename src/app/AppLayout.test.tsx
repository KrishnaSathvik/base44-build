import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppLayout } from '@/app/AppLayout';

vi.mock('@/lib/useCurrentUser', () => ({ useCurrentUser: () => ({ user: { email: 'owner@example.test' }, isLoading: false, isAuthenticated: true }) }));
vi.mock('@/api/base44Client', () => ({ base44: { auth: { logout: vi.fn() } } }));

test('uses a full-screen mobile issue detail without primary bottom navigation', () => {
  render(<MemoryRouter initialEntries={['/app/issues/issue-1']}><AppLayout /></MemoryRouter>);
  expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
});
