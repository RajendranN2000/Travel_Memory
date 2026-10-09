import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell } from "../auth-shell";
import { ResetRequestForm } from "../auth-forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a link to choose a new password."
      imageKey="ooty/fog-road"
      footer={
        <p>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ResetRequestForm disabled={!isSupabaseConfigured()} />
    </AuthShell>
  );
}
