"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/features/auth/schemas";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, isOwnedAvatarPath } from "./avatar";
import { PHOTO_BUCKET } from "@/features/trips/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z.string().trim().max(80, "Use 80 characters or fewer."),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({ displayName: formData.get("displayName") ?? "" });
  if (!parsed.success) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase isn't configured." };
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { status: "error", message: "Your session has expired. Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName || null })
    .eq("id", userId);
  if (error) return { status: "error", message: "We couldn't save your profile. Please try again." };
  return { status: "success", message: "Profile saved." };
}

type AvatarResult = { ok: true } | { ok: false; error: string };

async function signedInUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? { supabase, userId } : null;
}

/**
 * Records a profile photo after the browser has uploaded it to the user's
 * avatar folder. Verifies the path and the stored object's real type and
 * size, then replaces (and deletes) any previous photo.
 */
export async function setAvatar(path: unknown): Promise<AvatarResult> {
  const auth = await signedInUser();
  if (!auth) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (typeof path !== "string" || !isOwnedAvatarPath(auth.userId, path)) return { ok: false, error: "That upload wasn't valid." };
  const bucket = auth.supabase.storage.from(AVATAR_BUCKET);
  const discard = async (error: string): Promise<AvatarResult> => {
    await bucket.remove([path]);
    return { ok: false, error };
  };

  const { data: info, error: infoError } = await bucket.info(path);
  if (infoError || !info) return { ok: false, error: "We couldn't find the uploaded photo. Please try again." };
  const size = info.size ?? (info.metadata as { size?: number } | undefined)?.size ?? 0;
  const mime = info.contentType ?? (info.metadata as { mimetype?: string } | undefined)?.mimetype ?? "";
  if (mime !== "image/jpeg") return discard("Profile photos must be images.");
  if (size <= 0 || size > AVATAR_MAX_BYTES) return discard("That photo is too large. Please choose another one.");

  const { data: profile } = await auth.supabase.from("profiles").select("*").eq("id", auth.userId).maybeSingle();
  const { error } = await auth.supabase.from("profiles").update({ avatar_path: path }).eq("id", auth.userId);
  if (error) {
    const missing = /avatar_path/.test(error.message);
    return discard(missing ? "Profile photos aren't set up yet: apply the latest database migration." : "We couldn't save your photo. Please try again.");
  }
  const previous = profile?.avatar_path;
  if (previous && previous !== path) await bucket.remove([previous]);
  return { ok: true };
}

export async function removeAvatar(): Promise<AvatarResult> {
  const auth = await signedInUser();
  if (!auth) return { ok: false, error: "Your session has expired. Please sign in again." };
  const { data: profile } = await auth.supabase.from("profiles").select("*").eq("id", auth.userId).maybeSingle();
  const previous = profile?.avatar_path;
  if (!previous) return { ok: true };
  const { error } = await auth.supabase.from("profiles").update({ avatar_path: null }).eq("id", auth.userId);
  if (error) return { ok: false, error: "We couldn't remove your photo. Please try again." };
  await auth.supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  return { ok: true };
}

/**
 * Permanently deletes the signed-in user's account: their stored photos first,
 * then the auth user (which cascades to profile, trips, photos and
 * publications through foreign keys).
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("confirm") !== "DELETE") {
    return { status: "error", message: "Type DELETE to confirm.", fieldErrors: { confirm: "Type DELETE in capitals." } };
  }
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase isn't configured." };
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { status: "error", message: "Your session has expired. Please sign in again." };

  const admin = createAdminClient();
  if (!admin) {
    return { status: "error", message: "Account deletion needs the server secret key to be configured. Please contact support." };
  }

  const { data: photos, error: photoError } = await supabase.from("trip_photos").select("storage_path").eq("owner_id", userId);
  if (photoError) return { status: "error", message: "We couldn't delete your account right now. Nothing was removed." };
  const paths = (photos ?? []).map((p) => p.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
    if (error) return { status: "error", message: "We couldn't remove your photos. Please try again." };
  }

  const { data: avatars } = await admin.storage.from(AVATAR_BUCKET).list(userId);
  if (avatars?.length) {
    const { error } = await admin.storage.from(AVATAR_BUCKET).remove(avatars.map((f) => `${userId}/${f.name}`));
    if (error) return { status: "error", message: "We couldn't remove your profile photo. Please try again." };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { status: "error", message: "Your photos were removed, but we couldn't delete the account. Please try again." };

  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
