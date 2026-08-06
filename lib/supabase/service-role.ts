import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client with service role key.
 * Bypasses RLS - use ONLY in server-side code (API routes, server actions).
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Creating service role client:", {
    url: supabaseUrl,
    keyPrefix: serviceRoleKey ? serviceRoleKey.slice(0, 10) + "..." : "MISSING",
    keyLength: serviceRoleKey ? serviceRoleKey.length : 0
  });

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. " +
      "Please add it to your Vercel environment variables."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
