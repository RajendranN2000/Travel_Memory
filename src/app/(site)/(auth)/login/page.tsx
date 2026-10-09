import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/forms/field";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/features/auth/session";
import { safeNextPath } from "@/lib/safe-next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell title="Welcome back" description="Sign in to continue working on your memories." imageKey="munnar/road" footer={<SignupLink searchParams={searchParams} />}>
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-12" />
    </div>
  );
}

async function LoginForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="space-y-5">
      {params.error === "link" ? (
        <FormMessage status="error" message="That link has expired or was already used. Sign in, or request a new link." />
      ) : null}
      <SignInForm next={next} disabled={!isSupabaseConfigured()} />
    </div>
  );
}

function SignupLink({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  return (
    <Suspense fallback={<p>New here? <Link href="/signup" className="font-medium text-foreground underline underline-offset-2">Create an account</Link></p>}>
      <SignupLinkInner searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupLinkInner({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = safeNextPath((await searchParams).next);
  return (
    <p>
      New here?{" "}
      <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline underline-offset-2">
        Create an account
      </Link>
    </p>
  );
}
