import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PageIntro } from "@/components/site/page-intro";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/features/auth/session";
import { AvatarForm } from "./avatar-form";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

function Section({ id, title, description, children, tone }: { id: string; title: string; description: ReactNode; children: ReactNode; tone?: "danger" }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 grid gap-6 border-t border-border py-10 md:grid-cols-[1fr_1.4fr]">
      <div>
        <h2 id={`${id}-title`} className={`font-display text-2xl ${tone === "danger" ? "text-destructive" : ""}`}>
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>
      </div>
      <div className="max-w-md">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
      <PageIntro eyebrow="Account" title="Settings" />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const { user } = await requireUser("/settings");
  return (
    <>
      <Section id="photo" title="Profile photo" description="Shown in the header and menu while you're signed in.">
        <AvatarForm user={{ displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl }} userId={user.id} />
      </Section>
      <Section id="profile" title="Profile" description={<>Signed in as <strong className="text-foreground">{user.email}</strong>.</>}>
        <ProfileForm displayName={user.displayName ?? ""} />
      </Section>
      <Section id="password" title="Password" description="Choose a new password. If you arrived from a reset email, set it here.">
        <PasswordForm />
      </Section>
      <Section
        id="privacy"
        title="Privacy"
        description={
          <>
            Drafts are always private. Each published memory has its own visibility, which you can change from the
            editor. Read the{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              privacy notice
            </Link>
            .
          </>
        }
      >
        <ul className="space-y-3 text-sm leading-relaxed">
          <li>
            <strong>Public</strong>: anyone can view it, and it&apos;s only indexed by search engines if you allow it.
          </li>
          <li>
            <strong>Unlisted</strong>: only people with the link. It&apos;s never listed or indexed.
          </li>
          <li>
            <strong>Private</strong>: only you, while signed in.
          </li>
          <li>Photo location and camera data are removed before upload. We never ask for your location.</li>
        </ul>
      </Section>
      <Section
        id="delete"
        tone="danger"
        title="Delete account"
        description="Permanently deletes your account, every trip and published memory, and all stored photos. This can't be undone."
      >
        <DeleteAccountForm />
      </Section>
    </>
  );
}
