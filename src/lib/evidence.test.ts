import { expect, test } from 'vitest';
import { aggregateEvidence } from '@/lib/evidence';

test('aggregates report evidence as report counts', () => {
  const result = aggregateEvidence([
    { device_type: 'iPhone', browser_name: 'Safari', page_url: '/chat?x=1' },
    { device_type: 'iPhone', browser_name: 'Safari', page_url: 'https://example.com/chat' },
    { device_type: 'Desktop', browser_name: 'Chrome', page_url: '/settings' },
  ] as never);
  expect(result.devices).toEqual([['iPhone', 2], ['Desktop', 1]]);
  expect(result.pages).toEqual([['/chat', 2], ['/settings', 1]]);
});
