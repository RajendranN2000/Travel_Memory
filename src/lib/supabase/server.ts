import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseConfig } from "./env";

export type ServerSupabase = ReturnType<typeof createServerClient<Database>>;

/**
 * Creates a request-scoped Supabase client bound to the user's auth cookies.
 * Returns null when Supabase is not configured. Reads cookies, so callers
 * must render inside a <Suspense> boundary or run in a Server Action.
 */
export async function createClient(): Promise<ServerSupabase | null> {
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  // Auth checks compare token expiry with Date.now() and may refresh the
  // session over the network, so keep them out of prerenders and prefetches.
  await connection();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}
