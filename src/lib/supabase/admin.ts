import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseConfig } from "./env";

/**
 * Service-role client. Server-only and used for exactly two privileged jobs:
 *   1. Signing photo URLs for a published memory *after* the caller's access
 *      has been verified through get_published_memory().
 *   2. Deleting an account at the user's request.
 * Never import this from client components and never return it to callers.
 */
export function createAdminClient() {
  const config = getSupabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !secret || /replace-me|your-/i.test(secret)) return null;
  return createClient<Database>(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
