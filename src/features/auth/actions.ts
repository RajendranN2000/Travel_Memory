"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";
import {
  fieldErrorsFrom,
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  type FormState,
} from "./schemas";

const NOT_CONFIGURED: FormState = {
  status: "error",
  message: "Accounts are unavailable because Supabase isn't configured yet. See the setup guide at /setup.",
};

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error), values: { email } };
  }
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: "Please confirm your email address first. Check your inbox for the link.", values: { email } };
    }
    if (error.status === 429) {
      return { status: "error", message: "Too many attempts. Please wait a minute and try again.", values: { email } };
    }
    return { status: "error", message: "That email and password don't match an account.", values: { email } };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = signUpSchema.safeParse(raw);
  const values = { displayName: raw.displayName, email: raw.email };
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const next = safeNextPath(formData.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName || null },
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { status: "error", message: "Please choose a stronger password.", fieldErrors: { password: error.message }, values };
    }
    if (error.status === 429) {
      return { status: "error", message: "Too many sign-up attempts. Please wait a little and try again.", values };
    }
    return { status: "error", message: "We couldn't create your account. Please try again.", values };
  }

  // With email confirmation enabled there is no session yet. The same message
  // is shown whether or not the address already has an account.
  if (!data.session) {
    return {
      status: "success",
      message: `We've sent a confirmation link to ${parsed.data.email}. Open it to finish creating your account.`,
    };
  }
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent("/settings#password")}`,
  });
  if (error?.status === 429) {
    return { status: "error", message: "Too many requests. Please wait a minute and try again." };
  }
  // Same response whether or not the account exists.
  return {
    status: "success",
    message: "If an account exists for that address, a reset link is on its way. It expires in one hour.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { status: "error", message: "Your session has expired. Please sign in again." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { status: "error", message: "Choose a password you haven't used here before.", fieldErrors: { password: error.message } };
    }
    if (error.code === "weak_password") {
      return { status: "error", message: "Please choose a stronger password.", fieldErrors: { password: error.message } };
    }
    return { status: "error", message: "We couldn't update your password. Please try again." };
  }
  return { status: "success", message: "Your password has been updated." };
}
