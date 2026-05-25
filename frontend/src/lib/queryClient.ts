import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './api';

/**
 * Shared React Query client.
 *
 * Defaults:
 *   - retry: don't retry on 4xx — they're usually user-facing errors
 *     (validation, not-found, unauthorized). Retry on 5xx once.
 *   - staleTime: 30s — list pages feel snappy on back-nav without
 *     showing stale data for long.
 *   - refetchOnWindowFocus: off, to avoid surprise refetches in forms.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.status < 500) return false;
        return failureCount < 1;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
