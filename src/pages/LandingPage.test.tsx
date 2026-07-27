import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';

test('routes the primary landing action to project setup', () => {
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(screen.getAllByRole('link', { name: /create a feedback board/i })[0]).toHaveAttribute('href', '/app/setup');
});
