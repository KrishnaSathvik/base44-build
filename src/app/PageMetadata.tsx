import { useEffect } from 'react';
export function PageMetadata({ title, description }: { title: string; description: string }) { useEffect(() => { document.title = `${title} — Feedback Inbox`; const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]'); meta?.setAttribute('content', description); }, [title, description]); return null; }
