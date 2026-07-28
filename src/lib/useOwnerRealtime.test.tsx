import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, test, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useOwnerRealtime } from '@/lib/useOwnerRealtime';

const { subscribe, unsubscribe } = vi.hoisted(() => {
  const unsubscribeFn = vi.fn();
  const subscribeFn = vi.fn(() => unsubscribeFn);
  return { subscribe: subscribeFn, unsubscribe: unsubscribeFn };
});

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      FeedbackSubmission: { subscribe },
      Issue: { subscribe },
      IssueReport: { subscribe },
      DuplicateSuggestion: { subscribe },
      ReporterMessage: { subscribe },
      ActivityEvent: { subscribe },
    },
  },
}));

afterEach(() => {
  subscribe.mockClear();
  unsubscribe.mockClear();
});

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

test('subscribes to owner entities when enabled and cleans up', () => {
  const client = new QueryClient();
  const { unmount } = renderHook(() => useOwnerRealtime(true), { wrapper: wrapper(client) });
  expect(subscribe).toHaveBeenCalled();
  unmount();
  expect(unsubscribe).toHaveBeenCalled();
});

test('does not subscribe when disabled', () => {
  const client = new QueryClient();
  renderHook(() => useOwnerRealtime(false), { wrapper: wrapper(client) });
  expect(subscribe).not.toHaveBeenCalled();
});
