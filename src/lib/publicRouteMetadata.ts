import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_TITLE, PRODUCT_NAME, PRODUCT_TAGLINE, TWITTER_TITLE, pageTitle } from './brand';

export type PublicRouteMetadata = {
  path: string;
  title: string;
  description: string;
  h1: string;
  ogTitle?: string;
  twitterTitle?: string;
  includeJsonLd?: boolean;
};

export type JsonLdGraphNode = {
  '@type': string;
  '@id'?: string;
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  publisher?: { '@id': string };
};

export type HomepageJsonLd = {
  '@context': 'https://schema.org';
  '@graph': JsonLdGraphNode[];
};

export const PUBLIC_INDEXABLE_ROUTES: PublicRouteMetadata[] = [
  {
    path: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    h1: 'Feedback should tell you what to fix next.',
    ogTitle: OG_TITLE,
    twitterTitle: TWITTER_TITLE,
    includeJsonLd: true,
  },
  {
    path: '/demo',
    title: 'Demo',
    description:
      'Explore the VensaOS owner workspace with representative TrailVerse fixture data—Overview, Inbox, Issues, and resolve—without writing to a live board.',
    h1: 'Explore the real VensaOS interface using representative data.',
  },
  {
    path: '/security',
    title: 'Security & Data Handling',
    description: 'How VensaOS protects feedback, attachments, and account data.',
    h1: 'Security & Data Handling',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'How VensaOS collects, uses, and protects information.',
    h1: 'Privacy Policy',
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description: 'Terms governing use of VensaOS.',
    h1: 'Terms of Service',
  },
];

export function getPublicRouteMetadata(path: string): PublicRouteMetadata | undefined {
  return PUBLIC_INDEXABLE_ROUTES.find((route) => route.path === path);
}

export function buildHomepageJsonLd(origin: string): HomepageJsonLd {
  const base = origin.replace(/\/$/, '');
  const organizationId = `${base}/#organization`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: PRODUCT_NAME,
        url: `${base}/`,
        logo: `${base}/icon-512.png`,
        description: PRODUCT_TAGLINE,
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        name: PRODUCT_NAME,
        url: `${base}/`,
        description: DEFAULT_DESCRIPTION,
        publisher: { '@id': organizationId },
      },
    ],
  };
}

function replaceAttr(html: string, selectorHint: string, attr: string, value: string) {
  const pattern = new RegExp(`(<${selectorHint}[^>]*\\s${attr}=")([^"]*)(")`, 'i');
  if (!pattern.test(html)) return html;
  return html.replace(pattern, `$1${value}$3`);
}

function replaceTitle(html: string, title: string) {
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
}

function upsertJsonLd(html: string, origin: string, include: boolean) {
  const without = html.replace(/\s*<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/i, '');
  if (!include) return without;
  const payload = JSON.stringify(buildHomepageJsonLd(origin));
  return without.replace('</head>', `    <script type="application/ld+json">${payload}</script>\n  </head>`);
}

function upsertRootH1(html: string, h1: string) {
  const escaped = h1.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (/<div id="root">[\s\S]*?<\/div>/i.test(html)) {
    return html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root"><h1>${escaped}</h1></div>`);
  }
  return html.replace('<div id="root"></div>', `<div id="root"><h1>${escaped}</h1></div>`);
}

export function applyPublicRouteHtml(html: string, route: PublicRouteMetadata, origin: string) {
  const base = origin.replace(/\/$/, '');
  const canonical = `${base}${route.path === '/' ? '/' : route.path}`;
  const title = pageTitle(route.title);
  const ogTitle = route.ogTitle ?? title;
  const twitterTitle = route.twitterTitle ?? title;
  let next = replaceTitle(html, title);
  next = replaceAttr(next, 'meta name="description"', 'content', route.description);
  next = replaceAttr(next, 'meta property="og:title"', 'content', ogTitle);
  next = replaceAttr(next, 'meta property="og:description"', 'content', route.description);
  next = replaceAttr(next, 'meta property="og:url"', 'content', canonical);
  next = replaceAttr(next, 'meta name="twitter:title"', 'content', twitterTitle);
  next = replaceAttr(next, 'meta name="twitter:description"', 'content', route.description);
  next = replaceAttr(next, 'link rel="canonical"', 'href', canonical);
  next = upsertJsonLd(next, base, !!route.includeJsonLd);
  next = upsertRootH1(next, route.h1);
  return next;
}
