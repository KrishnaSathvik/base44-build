import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';

test('routes public CTAs through /app and /demo with consistent wording', () => {
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  const openWorkspace = screen.getAllByRole('link', { name: /open workspace/i });
  expect(openWorkspace.every((link) => link.getAttribute('href') === '/app')).toBe(true);
  expect(openWorkspace.length).toBeGreaterThanOrEqual(2);
  expect(screen.getByRole('link', { name: 'Explore live demo' })).toHaveAttribute('href', '/demo');
  expect(screen.queryByRole('link', { name: 'Live demo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'How it works' })).not.toBeInTheDocument();
  expect(screen.getByText('Feedback intelligence for product teams')).toBeVisible();
  expect(screen.getByText(/Share one feedback link/)).toBeVisible();
  expect(screen.getByText(/AI-assisted · Evidence-backed · Human-controlled/i)).toBeVisible();
  expect(screen.getByRole('heading', { name: /See what your team receives/i })).toBeVisible();
  for (const step of ['Collect', 'Understand', 'Group', 'Prioritize', 'Resolve', 'Close the loop']) {
    expect(screen.getByRole('heading', { name: step })).toBeVisible();
  }
  expect(screen.getAllByText('Mobile chat composer obscures new messages').length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Chat composer covers the newest message on iPhone/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText('FI-DEMO01').length).toBeGreaterThan(0);
  expect(screen.queryByText(/Coupon action freezes checkout/i)).not.toBeInTheDocument();
  expect(screen.queryByText('FI-7K2M9A')).not.toBeInTheDocument();
  expect(screen.getByText(/Device context/i)).toBeVisible();
  expect(screen.getByText('Feedback intelligence for product teams.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
});
