import { expect, test } from 'vitest';
import {
  PUBLIC_INDEXABLE_ROUTES,
  applyPublicRouteHtml,
  buildHomepageJsonLd,
  getPublicRouteMetadata,
} from '@/lib/publicRouteMetadata';
import { pageTitle } from '@/lib/brand';

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="https://vensaos.com/" />
    <meta name="description" content="Default description." />
    <meta property="og:title" content="Default OG" />
    <meta property="og:description" content="Default description." />
    <meta property="og:url" content="https://vensaos.com/" />
    <meta name="twitter:title" content="Default Twitter" />
    <meta name="twitter:description" content="Default description." />
    <title>Default Title</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

test('indexable public routes each have unique titles and descriptions', () => {
  const titles = PUBLIC_INDEXABLE_ROUTES.map((route) => pageTitle(route.title));
  const descriptions = PUBLIC_INDEXABLE_ROUTES.map((route) => route.description);
  expect(new Set(titles).size).toBe(PUBLIC_INDEXABLE_ROUTES.length);
  expect(new Set(descriptions).size).toBe(PUBLIC_INDEXABLE_ROUTES.length);
  expect(PUBLIC_INDEXABLE_ROUTES.every((route) => route.h1.trim().length > 0)).toBe(true);
});

test('getPublicRouteMetadata resolves known public paths', () => {
  expect(getPublicRouteMetadata('/privacy')?.title).toBe('Privacy Policy');
  expect(getPublicRouteMetadata('/missing')).toBeUndefined();
});

test('applyPublicRouteHtml writes crawler-visible title, description, canonical, and h1', () => {
  const privacy = getPublicRouteMetadata('/privacy')!;
  const html = applyPublicRouteHtml(SAMPLE_HTML, privacy, 'https://vensaos.com');
  expect(html).toContain(`<title>${pageTitle(privacy.title)}</title>`);
  expect(html).toContain(`content="${privacy.description}"`);
  expect(html).toContain('href="https://vensaos.com/privacy"');
  expect(html).toContain('content="https://vensaos.com/privacy"');
  expect(html).toContain(`<h1>${privacy.h1}</h1>`);
  expect(html).not.toContain('application/ld+json');
});

test('homepage HTML shell includes Organization and WebSite JSON-LD', () => {
  const home = getPublicRouteMetadata('/')!;
  const html = applyPublicRouteHtml(SAMPLE_HTML, home, 'https://vensaos.com');
  expect(html).toContain('application/ld+json');
  const jsonLd = buildHomepageJsonLd('https://vensaos.com');
  expect(jsonLd['@graph'].some((node) => node['@type'] === 'Organization')).toBe(true);
  expect(jsonLd['@graph'].some((node) => node['@type'] === 'WebSite')).toBe(true);
  expect(html).toContain('"@type":"Organization"');
  expect(html).toContain('"@type":"WebSite"');
});
