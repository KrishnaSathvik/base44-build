import { useRef, useState } from 'react';
import { Camera, Clipboard, ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Button, InlineError } from '@/components/ui';
import {
  MAX_SCREENSHOTS,
  type AttachmentSource,
  type PendingScreenshot,
  isScreenshotClipboardItem,
  readImageDimensions,
  validateScreenshotSelection,
} from '@/lib/attachments';

interface Props {
  screenshots: PendingScreenshot[];
  onChange: (screenshots: PendingScreenshot[]) => void;
  onRetry?: (key: string) => void;
  disabled?: boolean;
}

export function ScreenshotUploader({ screenshots, onChange, onRetry, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function addFiles(files: File[], source: AttachmentSource) {
    const validation = validateScreenshotSelection(screenshots.length, files);
    if (validation) { setError(validation); return; }
    setError(null);
    const additions = await Promise.all(files.map(async (file) => {
      const dimensions = await readImageDimensions(file);
      return {
        key: crypto.randomUUID(), file, source, previewUrl: URL.createObjectURL(file),
        ...dimensions, status: 'ready' as const, progress: 0,
      };
    }));
    onChange([...screenshots, ...additions]);
  }

  function remove(key: string) {
    const item = screenshots.find((entry) => entry.key === key);
    if (item) URL.revokeObjectURL(item.previewUrl);
    onChange(screenshots.filter((entry) => entry.key !== key));
  }

  return <section aria-label="Screenshot attachments" onPaste={(event) => {
    const items = Array.from(event.clipboardData.items).filter(isScreenshotClipboardItem);
    const files = items.map((item) => item.getAsFile()).filter((file): file is File => !!file);
    if (files.length) { event.preventDefault(); void addFiles(files, 'paste'); }
  }}>
    <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple
      onChange={(event) => { void addFiles(Array.from(event.target.files ?? []), window.matchMedia?.('(pointer: coarse)').matches ? 'library' : 'browse'); event.currentTarget.value = ''; }} />
    <button type="button" disabled={disabled || screenshots.length >= MAX_SCREENSHOTS}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files), 'browse'); }}
      className={`w-full rounded-lg border border-dashed px-5 py-7 text-center transition ${dragging ? 'border-ink bg-surface' : 'border-line-strong bg-surface-subtle/50'} disabled:opacity-50`}>
      <Upload className="mx-auto h-5 w-5 text-ink-muted" />
      <p className="mt-2 text-sm font-medium">Add screenshots</p>
      <p className="mt-1 text-xs text-ink-faint">Browse, drag and drop, or paste · PNG, JPEG, WebP · 10 MB each · up to 5</p>
      <p className="mt-2 inline-flex items-center gap-3 text-[11px] text-ink-muted"><Clipboard className="h-3.5 w-3.5"/>Paste supported <Camera className="h-3.5 w-3.5"/>Camera/library on mobile</p>
    </button>
    {error && <div className="mt-2"><InlineError>{error}</InlineError></div>}
    {screenshots.length ? <ul className="mt-3 grid gap-3 sm:grid-cols-2">
      {screenshots.map((item) => <li key={item.key} className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="aspect-video bg-surface-subtle"><img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" /></div>
        <div className="p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-medium">{item.file.name}</p><p className="mt-1 text-[10px] text-ink-faint">{(item.file.size / 1024 / 1024).toFixed(1)} MB · {item.source}</p></div><button type="button" aria-label={`Remove ${item.file.name}`} disabled={disabled || item.status === 'uploading'} onClick={() => remove(item.key)} className="p-2 text-ink-muted hover:text-critical"><Trash2 className="h-4 w-4"/></button></div>
          {item.status !== 'ready' && <div className="mt-3"><div className="h-1.5 overflow-hidden rounded bg-surface-subtle"><div className={`h-full ${item.status === 'failed' ? 'bg-critical' : 'bg-success'}`} style={{ width: `${item.progress}%` }}/></div><p className="mt-1 text-[10px] text-ink-muted">{item.status === 'uploading' ? `Uploading… ${item.progress}%` : item.status === 'uploaded' ? 'Private upload complete' : item.error || 'Upload interrupted'}</p>{item.status === 'failed' && onRetry && <Button type="button" variant="ghost" className="mt-1 min-h-8 px-2 text-xs" onClick={() => onRetry(item.key)}><RefreshCw className="h-3.5 w-3.5"/>Retry upload</Button>}</div>}
        </div>
      </li>)}
    </ul> : <p className="mt-2 flex items-center gap-2 text-xs text-ink-faint"><ImagePlus className="h-3.5 w-3.5"/>No screenshots selected. Text-only feedback is welcome.</p>}
  </section>;
}
