'use client';

/**
 * React Query Provider
 *
 * Wraps the application with QueryClientProvider to enable React Query hooks
 * Must be a client component to use React Query's client-side features
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Create QueryClient instance inside component to avoid sharing state between requests
  // This is important for Next.js to prevent data leakage between users
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus in production
            refetchOnWindowFocus: process.env.NODE_ENV === 'development',
            // Retry failed requests once
            retry: 1,
            // Cache time: 5 minutes
            gcTime: 1000 * 60 * 5,
            // Stale time: 1 minute
            staleTime: 1000 * 60,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query DevTools in development only */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
