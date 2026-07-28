import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { TermsPage } from '@/pages/TermsPage';

test('privacy policy covers collection, AI, and no-sale disclosures', () => {
  render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  expect(screen.getAllByText(/We do not sell personal information/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Base44-managed AI/i)).toBeVisible();
  expect(screen.getByText(/does not independently make final product decisions/i)).toBeVisible();
  expect(screen.getByText(/raw tracking token is not stored directly/i)).toBeVisible();
});

test('terms cover ownership, AI limits, and no billing language', () => {
  render(
    <MemoryRouter>
      <TermsPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
  expect(screen.getByText(/Customers retain ownership/i)).toBeVisible();
  expect(screen.getByText(/Owners remain responsible for product decisions/i)).toBeVisible();
  expect(screen.queryByText(/refund/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/subscription/i)).not.toBeInTheDocument();
});

test('security page describes implemented controls without fake compliance claims', () => {
  render(
    <MemoryRouter>
      <SecurityPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Security & Data Handling' })).toBeVisible();
  expect(screen.getByText(/Raw tracking tokens are not stored directly/i)).toBeVisible();
  expect(screen.getByText(/cached only in memory/i)).toBeVisible();
  expect(screen.getByText(/Real outbound notification delivery is currently disabled/i)).toBeVisible();
  expect(screen.getByText(/We do not claim SOC 2/i)).toBeVisible();
  expect(screen.queryByText(/HIPAA compliant/i)).not.toBeInTheDocument();
});
