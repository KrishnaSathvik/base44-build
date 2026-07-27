import { useCallback, useEffect, useRef, useState } from 'react';
import { Expand, ImageOff, RefreshCw, X } from 'lucide-react';
import { Button, Dialog, Skeleton } from '@/components/ui';

export interface GalleryAttachment { id?: string; accessKey?: string; file_name?: string; fileName?: string; width?: number | null; height?: number | null }
interface Props { attachments: GalleryAttachment[]; getAccess: (attachment: GalleryAttachment) => Promise<{ signedUrl: string; expiresAt: string }> }

export function AttachmentGallery({ attachments, getAccess }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<GalleryAttachment | null>(null);
  const loading = useRef(new Set<string>());
  const keyFor = (item: GalleryAttachment) => item.id ?? item.accessKey ?? '';
  const load = useCallback(async (item: GalleryAttachment) => {
    const key = keyFor(item); if (loading.current.has(key)) return; loading.current.add(key); setFailed((current) => ({ ...current, [key]: false }));
    try { const access = await getAccess(item); setUrls((current) => ({ ...current, [key]: access.signedUrl })); }
    catch { setFailed((current) => ({ ...current, [key]: true })); }
    finally { loading.current.delete(key); }
  }, [getAccess]);
  useEffect(() => { attachments.forEach((item) => { if (!urls[keyFor(item)] && !failed[keyFor(item)]) void load(item); }); }, [attachments, failed, load, urls]);
  if (!attachments.length) return <div className="rounded-lg border border-dashed border-line p-6 text-center"><ImageOff className="mx-auto h-5 w-5 text-ink-faint"/><p className="mt-2 text-sm">No screenshots submitted</p><p className="mt-1 text-xs text-ink-faint">The report contains text evidence only.</p></div>;
  return <><div className="grid gap-3 sm:grid-cols-2">{attachments.map((item) => { const key = keyFor(item); const name = item.file_name ?? item.fileName ?? 'Screenshot'; return <div key={key} className="overflow-hidden rounded-lg border border-line bg-surface"><div className="relative aspect-video bg-surface-subtle">{failed[key] ? <div className="flex h-full flex-col items-center justify-center"><ImageOff className="h-5 w-5 text-ink-faint"/><p className="mt-2 text-xs text-ink-muted">Attachment unavailable</p><Button type="button" variant="ghost" className="mt-1 min-h-8 text-xs" onClick={() => void load(item)}><RefreshCw className="h-3.5 w-3.5"/>Refresh access</Button></div> : urls[key] ? <><img src={urls[key]} alt={name} className="h-full w-full object-cover" onError={() => void load(item)}/><button type="button" aria-label={`Open ${name}`} onClick={() => setActive(item)} className="absolute inset-0 flex items-end justify-end bg-transparent p-2 opacity-0 transition hover:bg-ink/10 hover:opacity-100 focus:opacity-100"><span className="rounded bg-ink/75 p-2 text-white"><Expand className="h-4 w-4"/></span></button></> : <Skeleton className="h-full w-full"/>}</div><p className="truncate px-3 py-2 text-xs text-ink-muted">{name}</p></div>; })}</div>
    <Dialog open={!!active} title={active?.file_name ?? active?.fileName ?? 'Screenshot'} onClose={() => setActive(null)}>{active && urls[keyFor(active)] ? <div className="relative"><img src={urls[keyFor(active)]} alt={active.file_name ?? active.fileName ?? 'Screenshot'} className="max-h-[75vh] w-full object-contain" onError={() => void load(active)}/><button className="sr-only" onClick={() => setActive(null)}><X/>Close</button></div> : null}</Dialog></>;
}
