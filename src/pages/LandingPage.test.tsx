import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';

test('routes the primary landing action to project setup', () => {
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(screen.getAllByRole('link', { name: /create your feedback board/i })[0]).toHaveAttribute('href', '/app/setup');
  expect(screen.getByText('Feedback intelligence for product teams.')).toBeVisible();
  expect(screen.getByText(/VensaOS groups repeated problems/)).toBeVisible();
  for (const step of ['Collect','Understand','Group','Prioritize','Resolve','Close the loop']) expect(screen.getByRole('heading', { name: step })).toBeVisible();
});
