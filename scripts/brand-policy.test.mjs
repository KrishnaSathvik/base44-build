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

  it('allows the lowercase product name only inside an approved domain hostname', () => {
    expect(configuredHostedUrlReason({
      file: 'docs/vercel-domain-setup.md',
      match: 'vensaos',
      surrounding: 'Primary: https://vensaos.com and redirect https://www.vensaos.com',
    })).toBe('approved canonical or redirect hostname');

    expect(configuredHostedUrlReason({
      file: 'README.md',
      match: 'vensaos',
      surrounding: 'the vensaos product',
    })).toBe('');
  });
});
