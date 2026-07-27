export const ALLOWED_SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_SCREENSHOTS = 5;
export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

export type AttachmentSource = 'browse' | 'paste' | 'camera' | 'library';

export interface PendingScreenshot {
  key: string;
  file: File;
  source: AttachmentSource;
  previewUrl: string;
  width?: number;
  height?: number;
  status: 'ready' | 'uploading' | 'uploaded' | 'failed';
  progress: number;
  attachmentId?: string;
  error?: string;
}

export function validateScreenshot(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(ALLOWED_SCREENSHOT_TYPES as readonly string[]).includes(file.type)) return 'Only PNG, JPEG, and WebP screenshots are supported.';
  if (file.size <= 0) return 'This screenshot is empty.';
  if (file.size > MAX_SCREENSHOT_BYTES) return 'Each screenshot must be 10 MB or smaller.';
  return null;
}

export function validateScreenshotSelection(existingCount: number, files: ArrayLike<Pick<File, 'type' | 'size'>>): string | null {
  if (existingCount + files.length > MAX_SCREENSHOTS) return `You can attach up to ${MAX_SCREENSHOTS} screenshots.`;
  for (const file of Array.from(files)) {
    const error = validateScreenshot(file);
    if (error) return error;
  }
  return null;
}

export function isScreenshotClipboardItem(item: Pick<DataTransferItem, 'kind' | 'type'>): boolean {
  return item.kind === 'file' && (ALLOWED_SCREENSHOT_TYPES as readonly string[]).includes(item.type);
}

export async function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (value: { width?: number; height?: number }) => { if (settled) return; settled = true; resolve(value); URL.revokeObjectURL(url); };
    image.onload = () => finish({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => finish({});
    image.src = url;
    window.setTimeout(() => finish({}), 100);
  });
}
