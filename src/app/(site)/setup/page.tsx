import { CheckCircle2, CircleDashed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { Button } from "@/components/ui/button";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Setup", robots: { index: false } };

export default function SetupPage() {
  const configured = isSupabaseConfigured();
  const demo = isDemoMode();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
      <PageIntro eyebrow="Setup" title={configured ? "Supabase is connected" : "Connect Supabase to enable accounts"}>
        {configured
          ? "Accounts, saving, uploads and publishing are available."
          : "My Travel Memory stores accounts, drafts and photos in Supabase. Until it is configured, nothing can be saved, and the app never pretends otherwise."}
      </PageIntro>

      <ol className="space-y-6">
        {[
          ["Create a Supabase project", "Create a free project at supabase.com and copy its Project URL and publishable (anon) key."],
          ["Add environment variables", "Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and the server-only SUPABASE_SECRET_KEY."],
          ["Apply the database migrations", "Run `pnpm exec supabase link` then `pnpm exec supabase db push`, or paste the files from supabase/migrations into the SQL editor in order."],
          ["Configure auth redirects", "Set the Site URL and add <site>/auth/confirm to the redirect URLs in Authentication → URL Configuration."],
          ["Restart the dev server", "Environment variables are read at start-up."],
        ].map(([title, body], i) => (
          <li key={title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
            {configured ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
            ) : (
              <CircleDashed aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <h2 className="font-semibold">
                {i + 1}. {title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-muted-foreground">
        Full instructions, including deployment to Vercel, are in <code className="rounded bg-muted px-1.5 py-0.5">README.md</code>.
      </p>

      {demo ? (
        <div className="mt-10 rounded-lg border border-brand/40 bg-brand/5 p-6">
          <h2 className="font-display text-2xl">Development demo mode</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            While you work locally without Supabase, you can try the editor with clearly labelled sample data. Changes
            stay in your browser tab and are never saved. Demo mode is disabled in production builds.
          </p>
          <Button asChild className="mt-5">
            <Link href="/editor/demo">Open the demo editor</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
