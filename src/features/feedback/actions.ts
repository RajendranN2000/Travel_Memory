"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { emailSchema, fieldErrorsFrom, type FormState } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  kind: z.enum(["bug", "suggestion", "other"], { message: "Choose what this is about." }),
  message: z.string().trim().min(3, "Tell us a little more (at least 3 characters).").max(2000, "Keep it under 2000 characters."),
  email: z.union([z.literal(""), emailSchema]),
  page: z.string().max(300),
});

/** Stores a bug report or suggestion. Read it in Supabase → Table Editor → feedback. */
export async function submitFeedback(_prev: FormState, formData: FormData): Promise<FormState> {
  // Bots tend to fill every field. A real visitor never sees this one.
  if (String(formData.get("website") ?? "") !== "") return { status: "success", message: "Thank you! Your feedback has been sent." };

  const raw = {
    kind: String(formData.get("kind") ?? ""),
    message: String(formData.get("message") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    page: String(formData.get("page") ?? "").slice(0, 300),
  };
  const values = { kind: raw.kind, message: raw.message, email: raw.email };
  const parsed = feedbackSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Feedback is unavailable because Supabase isn't configured.", values };
  const { data } = await supabase.auth.getClaims();

  const { error } = await supabase.from("feedback").insert({
    user_id: data?.claims?.sub ?? null,
    kind: parsed.data.kind,
    message: parsed.data.message,
    contact_email: parsed.data.email || null,
    page: parsed.data.page || null,
    user_agent: ((await headers()).get("user-agent") ?? "").slice(0, 300) || null,
  });
  if (error) return { status: "error", message: "We couldn't send that just now. Please try again in a moment.", values };
  return { status: "success", message: "Thank you! Your feedback has been sent." };
}
