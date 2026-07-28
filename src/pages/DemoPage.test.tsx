import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { DemoPage } from '@/pages/DemoPage';

test('interactive demo is honestly labeled and exposes the workspace walkthrough', () => {
  render(<MemoryRouter><DemoPage /></MemoryRouter>);
  expect(screen.getByText('Interactive product demo')).toBeVisible();
  expect(screen.getByRole('heading', { name: /Explore the real VensaOS interface/i })).toBeVisible();
  expect(screen.getByText(/Nothing you do here affects a live workspace/i)).toBeVisible();
  expect(screen.getByRole('link', { name: /Open workspace/i })).toHaveAttribute('href', '/app');
  expect(screen.getByText(/1 issue needs attention/i)).toBeVisible();
  expect(screen.getByText('Live snapshot')).toBeVisible();

  fireEvent.click(screen.getAllByRole('button', { name: /Open the grouped issue/i })[0]!);
  expect(screen.getByText(/Base44 managed InvokeLLM/i)).toBeVisible();
  expect(screen.getByText('How VensaOS understood this')).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: /^Review the possible duplicate$/i }));
  expect(screen.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  expect(screen.getByText(/Everyday unreviewed work lives in Issues/i)).toBeVisible();
  expect(screen.getAllByText('Possible duplicate').length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole('button', { name: /Review suggestion/i }));
  expect(screen.getByText(/Owner review required/i)).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: /See how .Not fixed. reopens it/i }));
  expect(screen.getByText(/Reopened by reporter/i)).toBeVisible();
});
