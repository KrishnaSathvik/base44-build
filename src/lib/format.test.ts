import { severityLabel, slugify, statusLabel, typeLabel } from '@/lib/format';

test('formats frontend status and report labels', () => {
  expect(statusLabel('in_progress')).toBe('In progress');
  expect(severityLabel('critical')).toBe('Critical');
  expect(typeLabel('feature')).toBe('Feature request');
});

test('creates a URL-safe project slug', () => {
  expect(slugify('  Feedback & Fixes  ')).toBe('feedback-fixes');
});
