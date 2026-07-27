import { render, screen } from '@testing-library/react';
import { SeverityBadge, StatusBadge, Switch } from '@/components/ui';

test('renders status text without relying only on color', () => {
  render(<StatusBadge status="resolved" label="Resolved" />);
  expect(screen.getByText('Resolved')).toBeVisible();
});

test('renders severity text with its semantic marker', () => {
  render(<SeverityBadge severity="critical" label="Critical" />);
  expect(screen.getByText('Critical')).toBeVisible();
});

test('prevents switches from shrinking beyond the viewport', () => {
  render(<Switch checked label="Allow anonymous submissions" onChange={() => undefined} />);
  expect(screen.getByRole('switch')).toHaveClass('shrink-0');
});
