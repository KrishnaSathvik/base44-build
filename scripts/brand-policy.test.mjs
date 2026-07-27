import { describe, expect, it } from 'vitest';
import { configuredHostedUrlReason } from './brand-policy.mjs';

describe('configured hosted URL brand policy', () => {
  const appBaseUrl = 'https://feedback-inbox-9330ed4c.base44.app';

  it('classifies the exact stable Base44 hostname as technical identity', () => {
    expect(configuredHostedUrlReason({
      file: 'dist/index.html',
      match: 'feedback-inbox',
      surrounding: `<link rel="canonical" href="${appBaseUrl}/" />`,
      appBaseUrl,
    })).toBe('configured Base44 hosted application URL');
  });

  it('does not allow unrelated public legacy branding', () => {
    expect(configuredHostedUrlReason({
      file: 'dist/index.html',
      match: 'feedback-inbox',
      surrounding: '<title>feedback-inbox</title>',
      appBaseUrl,
    })).toBe('');
  });
});
