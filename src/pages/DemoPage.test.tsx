import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { DemoPage } from '@/pages/DemoPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('interactive demo is honestly labeled and exposes the workspace walkthrough', () => {
  render(<MemoryRouter><DemoPage /></MemoryRouter>);
  expect(screen.getByText('Interactive product demo')).toBeVisible();
  expect(screen.getByRole('heading', { name: /Explore the real VensaOS interface/i })).toBeVisible();
  expect(screen.getByText(/Nothing you do here affects a live workspace/i)).toBeVisible();
  expect(screen.getByRole('link', { name: /Open workspace/i })).toHaveAttribute('href', '/app');
  expect(screen.getByText(/1 issue needs attention/i)).toBeVisible();
  expect(screen.getByText('Live snapshot')).toBeVisible();
  expect(screen.getByText('Built for clear product decisions.')).toBeVisible();

  expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  expect(screen.getByRole('combobox')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '1' })).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: /Open the grouped issue/i })[0]!);
  expect(screen.getByText(/Base44 managed InvokeLLM/i)).toBeVisible();
  expect(screen.getByText('How VensaOS understood this')).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: /^Review the possible duplicate$/i }));
  expect(screen.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  expect(screen.getByText(/Everyday unreviewed work lives in Issues/i )).toBeVisible();
  expect(screen.getAllByText('Possible duplicate').length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole('button', { name: /Review suggestion/i }));
  expect(screen.getByText(/Owner review required/i)).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: /See how .Not fixed. reopens it/i }));
  expect(screen.getByText(/Reopened by reporter/i)).toBeVisible();
});

test('demo inbox shows list or detail on mobile, not both', () => {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: query.includes('max-width: 1023px'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  );

  render(<MemoryRouter><DemoPage /></MemoryRouter>);

  fireEvent.click(screen.getByRole('tab', { name: '2' }));
  expect(screen.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Review suggestion/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Back to Inbox/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Weather timeline is slow on older phones/i }));
  expect(screen.getByRole('button', { name: /Review suggestion/i })).toBeVisible();
  expect(screen.getByRole('button', { name: /Back to Inbox/i })).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: /Back to Inbox/i }));
  expect(screen.queryByRole('button', { name: /Review suggestion/i })).not.toBeInTheDocument();
});
