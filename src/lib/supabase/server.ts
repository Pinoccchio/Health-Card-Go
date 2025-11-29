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

/**
 * Create a Supabase admin client that bypasses Row Level Security (RLS)
 *
 * IMPORTANT: Only use this in API routes after verifying user permissions!
 * This client has full database access and bypasses all RLS policies.
 *
 * Usage:
 * ```tsx
 * import { createAdminClient } from '@/lib/supabase/server';
 *
 * export async function GET() {
 *   const supabase = await createClient(); // Regular client
 *   const { data: { user } } = await supabase.auth.getUser(); // Verify auth
 *
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *
 *   // Now use admin client for queries that need to bypass RLS
 *   const adminClient = createAdminClient();
 *   const { data } = await adminClient.from('table').select();
 * }
 * ```
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Admin client doesn't need cookies
        },
      },
    }
  );
}
