import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client with service role key.
 * Bypasses RLS - use ONLY in server-side code (API routes, server actions).
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}