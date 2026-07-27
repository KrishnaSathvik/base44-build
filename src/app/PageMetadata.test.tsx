import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { PageMetadata } from '@/app/PageMetadata';

test('updates route titles without duplicating VensaOS', () => {
  document.head.innerHTML = '<meta name="description" content=""><link rel="canonical" href="/">';
  const { rerender } = render(<PageMetadata title="Inbox" description="Inbox description" />);
  expect(document.title).toBe('Inbox — VensaOS');
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Inbox description');
  rerender(<PageMetadata title="VensaOS — Feedback Intelligence for Product Teams" description="Product description" />);
  expect(document.title).toBe('VensaOS — Feedback Intelligence for Product Teams');
  expect(document.title).not.toContain('VensaOS — VensaOS');
});
