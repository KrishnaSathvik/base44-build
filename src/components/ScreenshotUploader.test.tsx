import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import { ScreenshotUploader } from '@/components/ScreenshotUploader';
import type { PendingScreenshot } from '@/lib/attachments';

beforeEach(() => {
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
});

function Harness({ initial = [], onRetry }: { initial?: PendingScreenshot[]; onRetry?: (key: string) => void }) {
  const [items, setItems] = useState(initial);
  return <ScreenshotUploader screenshots={items} onChange={setItems} onRetry={onRetry}/>;
}

test('selects and removes a valid screenshot', async () => {
  const { container } = render(<Harness/>);
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  const file = new File(['png'], 'shot.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });
  expect(await screen.findByAltText('shot.png')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Remove shot.png' }));
  await waitFor(() => expect(screen.queryByAltText('shot.png')).not.toBeInTheDocument());
});

test('rejects unsupported selection and too many files', async () => {
  const { container } = render(<Harness/>);
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['x'], 'bad.svg', { type: 'image/svg+xml' })] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('PNG');
  fireEvent.change(input, { target: { files: Array.from({length:6},(_,i)=>new File(['x'],`${i}.png`,{type:'image/png'})) } });
  expect(await screen.findByRole('alert')).toHaveTextContent('up to 5');
});

test('accepts a pasted screenshot', async () => {
  render(<Harness/>);
  const file = new File(['png'], 'pasted.png', { type: 'image/png' });
  const item = { kind: 'file', type: 'image/png', getAsFile: () => file } as DataTransferItem;
  fireEvent.paste(screen.getByRole('region', { name: 'Screenshot attachments' }), { clipboardData: { items: [item] } });
  expect(await screen.findByAltText('pasted.png')).toBeVisible();
});

test('offers upload retry for interrupted uploads', () => {
  const onRetry = vi.fn();
  const file = new File(['png'], 'failed.png', { type: 'image/png' });
  render(<Harness onRetry={onRetry} initial={[{key:'k1',file,source:'browse',previewUrl:'blob:x',status:'failed',progress:100,error:'Upload interrupted'}]}/>);
  fireEvent.click(screen.getByRole('button', { name: /retry upload/i }));
  expect(onRetry).toHaveBeenCalledWith('k1');
});
