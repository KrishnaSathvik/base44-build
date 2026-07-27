import { expect, test } from 'vitest';
import { authenticationReturnUrl, ownerIssueUrl, publicBoardUrl, reporterTrackingUrl } from '@/lib/appUrls';

test('durable production links use the canonical VensaOS origin', () => {
  const production = { development: false, currentOrigin: 'https://branch.vercel.app' };
  expect(publicBoardUrl('trail verse', production)).toBe('https://vensaos.com/f/trail%20verse');
  expect(reporterTrackingUrl('abc/123', production)).toBe('https://vensaos.com/track/abc%2F123');
  expect(ownerIssueUrl('issue/id')).toBe('https://vensaos.com/app/issues/issue%2Fid');
});

test('local link previews remain clearly local', () => {
  const development = { development: true, currentOrigin: 'http://localhost:5173' };
  expect(publicBoardUrl('demo', development)).toBe('http://localhost:5173/f/demo');
  expect(reporterTrackingUrl('token', development)).toBe('http://localhost:5173/track/token');
});

test('authentication callbacks preserve only a same-origin path', () => {
  expect(authenticationReturnUrl('/app/issues?next=https://evil.example#token', 'https://preview.vercel.app')).toBe('https://preview.vercel.app/app/issues');
  expect(() => authenticationReturnUrl('https://evil.example/app', 'https://preview.vercel.app')).toThrow(/same-origin/i);
});
