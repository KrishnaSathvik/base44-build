import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { PageMetadata } from '@/app/PageMetadata';

afterEach(()=>{cleanup();vi.unstubAllEnvs();});

test('updates route titles without duplicating VensaOS', () => {
  document.head.innerHTML = '<meta name="description" content=""><meta name="robots" content=""><meta property="og:url" content=""><link rel="canonical" href="/">';
  const { rerender } = render(<PageMetadata title="Inbox" description="Inbox description" />);
  expect(document.title).toBe('Inbox — VensaOS');
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Inbox description');
  rerender(<PageMetadata title="VensaOS — Feedback Intelligence for Product Teams" description="Product description" />);
  expect(document.title).toBe('VensaOS — Feedback Intelligence for Product Teams');
  expect(document.title).not.toContain('VensaOS — VensaOS');
});

test('publishes canonical metadata only for explicitly indexable public routes', () => {
  document.head.innerHTML = '<meta name="description" content=""><meta name="robots" content=""><meta property="og:url" content=""><link rel="canonical" href="/">';
  const { rerender } = render(<PageMetadata title="Demo" description="Demo" canonicalPath="/demo" indexable />);
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href','https://vensaos.com/demo');
  expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content','https://vensaos.com/demo');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content','index, follow');
  rerender(<PageMetadata title="Private" description="Private" />);
  expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
  expect(document.querySelector('meta[property="og:url"]')).not.toHaveAttribute('content');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
});

test('preview deployments remain noindex while retaining production canonical identity', () => {
  vi.stubEnv('VITE_VERCEL_ENV','preview');
  document.head.innerHTML = '<meta name="description" content=""><meta name="robots" content=""><meta property="og:url" content=""><link rel="canonical" href="/">';
  render(<PageMetadata title="Demo" description="Demo" canonicalPath="/demo" indexable />);
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href','https://vensaos.com/demo');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
});

test('injects homepage JSON-LD only on the indexable home route', () => {
  document.head.innerHTML = '<meta name="description" content=""><meta name="robots" content=""><meta property="og:url" content=""><meta property="og:title" content=""><meta property="og:description" content=""><meta name="twitter:title" content=""><meta name="twitter:description" content=""><link rel="canonical" href="/">';
  const { rerender } = render(
    <PageMetadata
      title="VensaOS — Feedback Intelligence for Product Teams"
      description="Home description"
      canonicalPath="/"
      indexable
    />,
  );
  const script = document.querySelector('script[type="application/ld+json"]');
  expect(script?.textContent).toContain('"@type":"Organization"');
  expect(script?.textContent).toContain('"@type":"WebSite"');
  expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'VensaOS — Know What Users Need Fixed Next',
  );
  rerender(<PageMetadata title="Privacy Policy" description="Privacy" canonicalPath="/privacy" indexable />);
  expect(document.querySelector('script[type="application/ld+json"]')).not.toBeInTheDocument();
  expect(document.title).toBe('Privacy Policy — VensaOS');
  expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Privacy Policy — VensaOS',
  );
});
