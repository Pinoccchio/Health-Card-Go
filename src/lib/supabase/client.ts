import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for use in the browser (Client Components)
 *
 * Usage:
 * ```tsx
 * 'use client';
 * import { createClient } from '@/lib/supabase/client';
 *
 * export default function MyComponent() {
 *   const supabase = createClient();
 *   // ...
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
