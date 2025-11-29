/**
 * Supabase Admin Client
 *
 * This client uses the service role key and should ONLY be used server-side.
 * It has admin privileges to bypass Row Level Security (RLS) policies.
 *
 * NEVER import this in client-side code!
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Create an admin client with service role key
 * This client has full database access and bypasses RLS
 *
 * @returns Supabase client with admin privileges
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
