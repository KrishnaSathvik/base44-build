import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthPanel } from '@/app/AuthPanel';
import { base44 } from '@/api/base44Client';

vi.mock('@/api/base44Client', () => ({ base44: { auth: { loginViaEmailPassword: vi.fn(), register: vi.fn(), verifyOtp: vi.fn(), loginWithProvider: vi.fn() } } }));

test('brands sign-in and registration as VensaOS', () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthPanel /></MemoryRouter></QueryClientProvider>);
  expect(screen.getByRole('heading', { name: 'Welcome to VensaOS' })).toBeVisible();
  expect(document.title).toBe('Sign In — VensaOS');
  fireEvent.click(screen.getByRole('button', { name: 'Create one' }));
  expect(screen.getByRole('heading', { name: 'Create your VensaOS account' })).toBeVisible();
  expect(document.title).toBe('Create Account — VensaOS');
});

test('social authentication returns only to the current same-origin path', () => {
  window.history.replaceState({},'', '/app/issues?next=https://evil.example#private');
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthPanel /></MemoryRouter></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button',{name:'Continue with Google'}));
  expect(base44.auth.loginWithProvider).toHaveBeenCalledWith('google','http://localhost:3000/app/issues');
});
