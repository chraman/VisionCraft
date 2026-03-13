import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min default
      gcTime: 300_000, // 5 min
      refetchOnWindowFocus: false,
      retry: (count, err) => {
        // Never retry on 4xx client errors
        const status =
          err != null &&
          typeof err === 'object' &&
          'response' in err &&
          err.response != null &&
          typeof err.response === 'object' &&
          'status' in err.response
            ? (err.response as { status: number }).status
            : null;
        if (status !== null && status < 500) return false;
        return count < 2;
      },
    },
  },
  queryCache: new QueryCache({
    onError: (err) => Sentry.captureException(err),
  }),
  mutationCache: new MutationCache({
    onError: (err) => Sentry.captureException(err),
  }),
});
