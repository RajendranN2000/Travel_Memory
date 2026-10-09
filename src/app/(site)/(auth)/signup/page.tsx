import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/features/auth/session";
import { safeNextPath } from "@/lib/safe-next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <AuthShell
      title="Start your first memory"
      description="Create a free account to save drafts, upload photos and publish your memories."
      imageKey="goa/cove"
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="space-y-5" aria-hidden>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-12" />
          </div>
        }
      >
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return <SignUpForm next={next} disabled={!isSupabaseConfigured()} />;
}
