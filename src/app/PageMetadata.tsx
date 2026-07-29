import { useEffect } from 'react';
import { OG_TITLE, TWITTER_TITLE, pageTitle } from '@/lib/brand';
import { buildHomepageJsonLd, getPublicRouteMetadata } from '@/lib/publicRouteMetadata';
import { buildCanonicalUrl, CANONICAL_APP_ORIGIN } from '../../base44/shared/configuration';

const JSON_LD_ATTR = 'data-vensaos-jsonld';

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

function syncJsonLd(canonicalPath: string | undefined, indexable: boolean) {
  document.querySelectorAll(`script[${JSON_LD_ATTR}]`).forEach((node) => node.remove());
  if (!indexable || canonicalPath !== '/') return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(JSON_LD_ATTR, 'true');
  script.textContent = JSON.stringify(buildHomepageJsonLd(CANONICAL_APP_ORIGIN));
  document.head.appendChild(script);
}

export function PageMetadata({ title, description, canonicalPath, indexable = false }: { title: string; description: string; canonicalPath?: string; indexable?: boolean }) {
  useEffect(() => {
    const resolvedTitle = pageTitle(title);
    const route = canonicalPath ? getPublicRouteMetadata(canonicalPath) : undefined;
    document.title = resolvedTitle;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:description"]', description);
    setMeta(
      'meta[property="og:title"]',
      indexable && canonicalPath === '/' ? OG_TITLE : route?.ogTitle ?? resolvedTitle,
    );
    setMeta(
      'meta[name="twitter:title"]',
      indexable && canonicalPath === '/' ? TWITTER_TITLE : route?.twitterTitle ?? resolvedTitle,
    );
    const preview = import.meta.env.VITE_VERCEL_ENV === 'preview';
    setMeta('meta[name="robots"]', indexable && !preview ? 'index, follow' : 'noindex, nofollow');
    const existingCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (indexable && canonicalPath) {
      const url = buildCanonicalUrl(canonicalPath);
      const canonical = existingCanonical ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
      canonical.setAttribute('href', url);
      ogUrl?.setAttribute('content', url);
    } else {
      existingCanonical?.remove();
      ogUrl?.removeAttribute('content');
    }
    syncJsonLd(canonicalPath, indexable);
  }, [title, description, canonicalPath, indexable]);
  return null;
}
