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
