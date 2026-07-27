import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AttachmentGallery } from '@/components/AttachmentGallery';

test('shows an intentional no-screenshot evidence state', () => {
  render(<AttachmentGallery attachments={[]} getAccess={vi.fn()}/>);
  expect(screen.getByText('No screenshots submitted')).toBeVisible();
});

test('refreshes temporary access when an image link expires', async () => {
  const getAccess=vi.fn()
    .mockResolvedValueOnce({signedUrl:'https://signed.invalid/first',expiresAt:'2026-01-01T00:05:00Z'})
    .mockResolvedValueOnce({signedUrl:'https://signed.invalid/refreshed',expiresAt:'2026-01-01T00:10:00Z'});
  render(<AttachmentGallery attachments={[{id:'a1',file_name:'shot.png'}]} getAccess={getAccess}/>);
  const image=await screen.findByAltText('shot.png');
  fireEvent.error(image);
  await waitFor(()=>expect(getAccess).toHaveBeenCalledTimes(2));
});
