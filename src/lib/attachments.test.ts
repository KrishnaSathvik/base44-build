import { describe, expect, test } from 'vitest';
import { MAX_SCREENSHOT_BYTES, isScreenshotClipboardItem, validateScreenshot, validateScreenshotSelection } from '@/lib/attachments';

describe('screenshot validation', () => {
  test('accepts a valid screenshot', () => expect(validateScreenshot({ type: 'image/png', size: 1024 })).toBeNull());
  test('rejects an unsupported MIME even when it looks like an image', () => expect(validateScreenshot({ type: 'image/svg+xml', size: 1024 })).toMatch(/PNG/));
  test('rejects an oversized screenshot', () => expect(validateScreenshot({ type: 'image/jpeg', size: MAX_SCREENSHOT_BYTES + 1 })).toMatch(/10 MB/));
  test('enforces the five-file maximum', () => expect(validateScreenshotSelection(4, [{ type: 'image/png', size: 1 }, { type: 'image/png', size: 1 }])).toMatch(/up to 5/));
  test('recognizes supported pasted screenshots', () => expect(isScreenshotClipboardItem({ kind: 'file', type: 'image/webp' })).toBe(true));
});
