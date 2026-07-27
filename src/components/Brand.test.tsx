import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Brand } from '@/components/Brand';

test('renders the Feedback Inbox brand linked to home', () => {
  render(<MemoryRouter><Brand /></MemoryRouter>);
  const brand = screen.getByRole('link', { name: 'Feedback Inbox' });
  expect(brand).toHaveAttribute('href', '/');
  expect(brand.querySelector('img')).toHaveAttribute('src', '/logo.png');
});
