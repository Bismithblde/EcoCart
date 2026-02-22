import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

/**
 * Server-side Supabase client for API routes.
 * Uses the anon key for auth operations (signIn, signUp, etc.).
 * Throws at runtime if env vars are missing when the client is first used.
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY to .env.local"
    );
  }
  _supabase = createClient(url, key);
  return _supabase;
}

/**
 * Supabase client authenticated as the user for RLS-protected tables.
 * Pass the access_token from Authorization: Bearer <token>.
 */
export function getSupabaseForUser(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY to .env.local"
    );
  }
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Supabase client with service role key. Bypasses RLS. Use only after verifying
 * user ownership (e.g. load list with user client, then load items with this).
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function getSupabaseServiceRole(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
