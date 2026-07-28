import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { SiteFooter } from '@/components/SiteFooter';

test('site footer links trust pages and shows product tagline', () => {
  render(
    <MemoryRouter>
      <SiteFooter />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: /VensaOS/i })).toHaveAttribute('href', '/');
  expect(screen.getByText('Feedback intelligence for product teams.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Demo' })).toHaveAttribute('href', '/demo');
  expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/security');
  expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
  expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
  expect(screen.getByText('© 2026 VensaOS')).toBeVisible();
});
