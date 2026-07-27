import { useEffect } from 'react';
import { pageTitle } from '@/lib/brand';

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

export function PageMetadata({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = pageTitle(title);
    setMeta('meta[name="description"]', description);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const url = new URL(window.location.pathname, window.location.origin).toString();
    canonical?.setAttribute('href', url);
    setMeta('meta[property="og:url"]', url);
  }, [title, description]);
  return null;
}
