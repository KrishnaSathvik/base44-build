import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { OwnerSetupPage } from '@/pages/OwnerSetupPage';

vi.mock('@/lib/useCurrentUser', () => ({ useCurrentUser: () => ({ user: { email: 'owner@example.test' } }) }));
vi.mock('@/lib/api', () => ({ createProject: vi.fn() }));

test('presents VensaOS workspace setup while keeping customer product fields distinct', () => {
  render(<MemoryRouter><OwnerSetupPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Set up your VensaOS workspace' })).toBeVisible();
  expect(screen.getByText('Create your first feedback board for your product.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Create your first feedback board' })).toBeVisible();
});
