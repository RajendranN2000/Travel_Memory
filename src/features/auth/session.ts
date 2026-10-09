import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { AVATAR_BUCKET } from "@/features/account/avatar";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
  displayName: string | null;
  /** Short-lived signed URL for the profile photo, or null. */
  avatarUrl: string | null;
}

const AVATAR_URL_TTL = 60 * 60;

/**
 * Returns the signed-in user, verified on the server, or null. Deduplicated
 * per request. Reads cookies, so call it inside a Suspense boundary.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  // `*` keeps this working if the avatar migration hasn't been applied yet.
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  const avatarPath = profile?.avatar_path ?? null;
  let avatarUrl: string | null = null;
  if (avatarPath) {
    const { data: signed } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(avatarPath, AVATAR_URL_TTL);
    avatarUrl = signed?.signedUrl ?? null;
  }
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    displayName: profile?.display_name ?? null,
    avatarUrl,
  };
});

/**
 * Requires a signed-in user for a protected page or action. Redirects to the
 * login page (returning to `nextPath` afterwards) when there is no session.
 */
export async function requireUser(nextPath: string): Promise<{ user: CurrentUser; supabase: ServerSupabase }> {
  const supabase = await createClient();
  if (!supabase) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return { user, supabase };
}
