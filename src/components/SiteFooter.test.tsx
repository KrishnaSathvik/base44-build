import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { SiteFooter } from '@/components/SiteFooter';

test('site footer links home and shows product tagline', () => {
  render(
    <MemoryRouter>
      <SiteFooter />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: /VensaOS/i })).toHaveAttribute('href', '/');
  expect(screen.getByText('Built for clear product decisions.')).toBeVisible();
});
