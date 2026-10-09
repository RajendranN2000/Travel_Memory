"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/features/auth/schemas";
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

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { status: "error", message: "Your photos were removed, but we couldn't delete the account. Please try again." };

  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
