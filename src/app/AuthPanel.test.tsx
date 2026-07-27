import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthPanel } from '@/app/AuthPanel';
import { base44 } from '@/api/base44Client';

vi.mock('@/api/base44Client', () => ({ base44: { auth: { loginViaEmailPassword: vi.fn(), register: vi.fn(), verifyOtp: vi.fn(), loginWithProvider: vi.fn() } } }));

test('brands sign-in and registration as VensaOS workspace entry', () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthPanel /></MemoryRouter></QueryClientProvider>);
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(screen.getByText(/Open your VensaOS workspace/)).toBeVisible();
  expect(document.title).toBe('Sign In — VensaOS');
  expect(screen.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Create one' }));
  expect(screen.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
  expect(screen.getByText(/Set up your feedback board/)).toBeVisible();
  expect(document.title).toBe('Create Account — VensaOS');
  expect(screen.getByRole('button', { name: /Sign up with Google/i })).toBeVisible();
  expect(screen.getByText(/At least 8 characters/)).toBeVisible();
});

test('social authentication returns only to the current same-origin path', () => {
  window.history.replaceState({}, '', '/app/issues?next=https://evil.example#private');
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthPanel /></MemoryRouter></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Sign in with Google/i }));
  expect(base44.auth.loginWithProvider).toHaveBeenCalledWith('google', 'http://localhost:3000/app/issues');
});
