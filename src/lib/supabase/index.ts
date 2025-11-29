/**
 * Supabase Client Utilities
 *
 * Exports all Supabase client functions for use throughout the application.
 */

export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient } from './server';
export { updateSession } from './middleware';
export type { Database } from './types';
