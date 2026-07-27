import { useQuery } from '@tanstack/react-query';
import type { User } from '@base44/sdk';
import { base44 } from '@/api/base44Client';

/**
 * Resolves the current authenticated user, or null when unauthenticated.
 * `auth.me()` throws on a 401, which we treat as "not signed in".
 */
export function useCurrentUser() {
  const query = useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
  };
}
