import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Brand } from '@/components/Brand';

test('renders the VensaOS brand linked to home with the approved logo', () => {
  render(<MemoryRouter><Brand /></MemoryRouter>);
  const brand = screen.getByRole('link', { name: 'VensaOS' });
  expect(brand).toHaveAttribute('href', '/');
  expect(brand.querySelector('img')).toHaveAttribute('src', '/logo.png');
});
