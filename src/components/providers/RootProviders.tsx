'use client';

import { ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { ReactQueryProvider } from '@/lib/contexts/ReactQueryProvider';

interface RootProvidersProps {
  children: ReactNode;
  initialUser?: SupabaseUser | null;
}

/**
 * Client-side provider wrapper for the root layout
 * Combines all global providers in the correct nesting order
 */
export function RootProviders({ children, initialUser }: RootProvidersProps) {
  return (
    <ReactQueryProvider>
      <AuthProvider initialUser={initialUser}>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </ReactQueryProvider>
  );
}
