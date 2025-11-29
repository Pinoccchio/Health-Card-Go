import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for use in Server Components and Server Actions
 *
 * This client handles cookie-based sessions automatically.
 *
 * Usage in Server Components:
 * ```tsx
 * import { createClient } from '@/lib/supabase/server';
 *
 * export default async function MyServerComponent() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('table').select();
 *   // ...
 * }
 * ```
 *
 * Usage in Server Actions:
 * ```tsx
 * 'use server';
 * import { createClient } from '@/lib/supabase/server';
 *
 * export async function myAction() {
 *   const supabase = await createClient();
 *   // ...
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
