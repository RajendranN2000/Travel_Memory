"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const reviewSchema = z.object({
  slug: z.string().regex(SLUG_RE).max(90),
  rating: z.coerce.number({ message: "Choose a star rating." }).int().min(1, "Choose a star rating.").max(5, "Choose a star rating."),
  comment: z.string().trim().max(500, "Keep your review under 500 characters."),
});

function reason(message: string | undefined, fallback: string): string {
  if (message?.includes("not_signed_in")) return "Sign in to leave a review.";
  if (message?.includes("own_memory")) return "You can't review your own memory.";
  if (message?.includes("memory_not_found")) return "Only public memories can be reviewed.";
  return fallback;
}

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    slug: String(formData.get("slug") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    comment: String(formData.get("comment") ?? ""),
  };
  const values = { rating: raw.rating, comment: raw.comment };
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please check your review.", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Reviews are unavailable right now.", values };

  const { error } = await supabase.rpc("submit_memory_review", {
    p_slug: parsed.data.slug,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment,
  });
  if (error) return { status: "error", message: reason(error.message, "We couldn't save your review. Please try again."), values };
  revalidatePath(`/memory/${parsed.data.slug}`);
  return { status: "success", message: "Thanks! Your review is on the page." };
}

export async function deleteReview(slug: string): Promise<{ ok: boolean }> {
  if (!SLUG_RE.test(slug) || slug.length > 90) return { ok: false };
  const supabase = await createClient();
  if (!supabase) return { ok: false };
  const { error } = await supabase.rpc("delete_my_memory_review", { p_slug: slug });
  if (error) return { ok: false };
  revalidatePath(`/memory/${slug}`);
  return { ok: true };
}
