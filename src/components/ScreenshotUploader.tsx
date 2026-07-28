import { useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react';
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
  const atLimit = screenshots.length >= MAX_SCREENSHOTS;
  const remaining = MAX_SCREENSHOTS - screenshots.length;

  async function addFiles(files: File[], source: AttachmentSource) {
    const validation = validateScreenshotSelection(screenshots.length, files);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    const additions = await Promise.all(
      files.map(async (file) => {
        const dimensions = await readImageDimensions(file);
        return {
          key: crypto.randomUUID(),
          file,
          source,
          previewUrl: URL.createObjectURL(file),
          ...dimensions,
          status: 'ready' as const,
          progress: 0,
        };
      }),
    );
    onChange([...screenshots, ...additions]);
  }

  function remove(key: string) {
    const item = screenshots.find((entry) => entry.key === key);
    if (item) URL.revokeObjectURL(item.previewUrl);
    onChange(screenshots.filter((entry) => entry.key !== key));
  }

  return (
    <section
      aria-label="Screenshot attachments"
      onPaste={(event) => {
        const items = Array.from(event.clipboardData.items).filter(isScreenshotClipboardItem);
        const files = items.map((item) => item.getAsFile()).filter((file): file is File => !!file);
        if (files.length) {
          event.preventDefault();
          void addFiles(files, 'paste');
        }
      }}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => {
          void addFiles(
            Array.from(event.target.files ?? []),
            window.matchMedia?.('(pointer: coarse)').matches ? 'library' : 'browse',
          );
          event.currentTarget.value = '';
        }}
      />

      <button
        type="button"
        disabled={disabled || atLimit}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles(Array.from(event.dataTransfer.files), 'browse');
        }}
        className={`group w-full rounded-xl border border-dashed px-4 py-8 text-center transition sm:px-6 ${
          dragging
            ? 'border-ink bg-surface'
            : 'border-line-strong bg-canvas hover:border-ink/40 hover:bg-surface'
        } disabled:pointer-events-none disabled:opacity-50`}
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition group-hover:border-ink group-hover:text-ink">
          <Upload className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-[15px] font-medium text-ink sm:text-base">
          {atLimit
            ? 'Screenshot limit reached'
            : dragging
              ? 'Drop screenshots here'
              : 'Drag and drop, or click to upload'}
        </p>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          PNG, JPEG, or WebP · up to 10 MB each
          {screenshots.length > 0 ? ` · ${remaining} of ${MAX_SCREENSHOTS} left` : ` · up to ${MAX_SCREENSHOTS}`}
        </p>
      </button>

      {error && (
        <div className="mt-3">
          <InlineError>{error}</InlineError>
        </div>
      )}

      {screenshots.length ? (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {screenshots.map((item) => (
            <li key={item.key} className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="aspect-[16/10] bg-canvas">
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{item.file.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-faint">
                      {(item.file.size / 1024 / 1024).toFixed(1)} MB · {item.source}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    disabled={disabled || item.status === 'uploading'}
                    onClick={() => remove(item.key)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-canvas hover:text-critical"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.status !== 'ready' && (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded bg-canvas">
                      <div
                        className={`h-full ${item.status === 'failed' ? 'bg-critical' : 'bg-success'}`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {item.status === 'uploading'
                        ? `Uploading… ${item.progress}%`
                        : item.status === 'uploaded'
                          ? 'Private upload complete'
                          : item.error || 'Upload interrupted'}
                    </p>
                    {item.status === 'failed' && onRetry && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-1 min-h-11 px-2 text-xs"
                        onClick={() => onRetry(item.key)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry upload
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink-faint">
          <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Optional — text-only feedback is fine.
        </p>
      )}
    </section>
  );
}
