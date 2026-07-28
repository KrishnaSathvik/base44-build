import { expect, test } from 'vitest';
import { collectEnvironmentContext, parseUserAgent } from '@/lib/environment';

test('parses useful Safari iPhone context without fingerprinting fields', () => {
  const result = parseUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  );
  expect(result).toEqual({
    browserName: 'Safari',
    browserVersion: '18.0',
    operatingSystem: 'iOS',
    deviceType: 'iPhone',
  });
});

test('does not treat the feedback portal path as the product page', () => {
  const withoutParam = collectEnvironmentContext('/f/groceries-smart-lists-lpxu');
  expect(withoutParam.pageUrl).toBeUndefined();

  const withParam = collectEnvironmentContext('?page=/checkout');
  expect(withParam.pageUrl).toBe('/checkout');
});
