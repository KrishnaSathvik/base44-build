import { useEffect } from 'react';
import { pageTitle } from '@/lib/brand';
import { buildCanonicalUrl } from '../../base44/shared/configuration';

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

export function PageMetadata({ title, description, canonicalPath, indexable = false }: { title: string; description: string; canonicalPath?: string; indexable?: boolean }) {
  useEffect(() => {
    document.title = pageTitle(title);
    setMeta('meta[name="description"]', description);
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
  }, [title, description, canonicalPath, indexable]);
  return null;
}
