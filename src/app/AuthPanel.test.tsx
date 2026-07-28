import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthPanel } from '@/app/AuthPanel';

vi.mock('@/api/base44Client', () => ({ base44: { auth: { loginViaEmailPassword: vi.fn(), register: vi.fn(), verifyOtp: vi.fn() } } }));

test('brands sign-in and registration as VensaOS workspace entry', () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthPanel /></MemoryRouter></QueryClientProvider>);
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(screen.getByText(/Open your VensaOS workspace/)).toBeVisible();
  expect(document.title).toBe('Sign In — VensaOS');
  expect(screen.queryByRole('button', { name: /Google/i })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Create one' }));
  expect(screen.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
  expect(screen.getByText(/Set up your feedback board/)).toBeVisible();
  expect(document.title).toBe('Create Account — VensaOS');
  expect(screen.queryByRole('button', { name: /Google/i })).toBeNull();
  expect(screen.getByText(/At least 8 characters/)).toBeVisible();
});

test('offers email and password only on the free-plan auth surface', () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthPanel /></MemoryRouter></QueryClientProvider>);
  expect(screen.getByLabelText('Email')).toBeVisible();
  expect(screen.getByLabelText('Password')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
  expect(screen.queryByText(/Sign in with Google/i)).toBeNull();
});
