import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const ENTITY_NAMES = [
  'FeedbackSubmission',
  'Issue',
  'IssueReport',
  'DuplicateSuggestion',
  'ReporterMessage',
  'ActivityEvent',
] as const;

const QUERY_ROOTS = new Set([
  'inbox',
  'issues',
  'projects',
  'notification-deliveries',
  'issue',
  'issue-report',
  'activity',
  'reporter-messages',
]);

const POLL_MS = 15_000;

function invalidateOwnerQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const root = query.queryKey[0];
      return typeof root === 'string' && QUERY_ROOTS.has(root);
    },
  });
}

/**
 * Keeps owner dashboard queries fresh via Base44 entity subscribe + visible-tab polling.
 */
export function useOwnerRealtime(enabled: boolean) {
  const queryClient = useQueryClient();
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (!enabledRef.current) return;
      invalidateOwnerQueries(queryClient);
    };

    const dynamic = base44.entities as unknown as Record<
      string,
      { subscribe?: (callback: () => void) => () => void }
    >;
    const unsubscribers = ENTITY_NAMES.map((name) => dynamic[name]?.subscribe?.(refresh)).filter(
      Boolean,
    ) as Array<() => void>;

    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(pollId);
    };
  }, [enabled, queryClient]);
}
