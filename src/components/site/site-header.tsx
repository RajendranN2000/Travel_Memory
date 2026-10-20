import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AccountMenu } from "./account-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { CreateCta, NavLinks, NavLinksFallback } from "./nav-links";

async function Account() {
  const user = await getCurrentUser();
  const headerUser = user ? { displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl } : null;
  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        {headerUser ? (
          <AccountMenu user={headerUser} />
        ) : (
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
      <MobileNav user={headerUser} />
    </>
  );
}

function AccountFallback() {
  return (
    <>
      <div className="hidden md:block">
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
      <MobileNav user={null} />
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_8px_24px_-18px_rgba(40,30,15,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      {!isSupabaseConfigured() ? (
        <p className="bg-ink px-4 py-2 text-center text-xs text-paper">
          Supabase isn&apos;t configured, so accounts and saving are off.{" "}
          <Link href="/setup" className="underline underline-offset-2">
            Read the setup guide
          </Link>
        </p>
      ) : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Primary" className="ml-4 hidden rounded-full border border-border bg-card/80 p-1 shadow-sm md:block">
          <Suspense fallback={<NavLinksFallback className="flex items-center gap-1" />}>
            <NavLinks className="flex items-center gap-1" />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {/* Fallback is empty so the button never flashes on /create. */}
          <Suspense fallback={null}>
            <CreateCta className="hidden sm:inline-flex" />
          </Suspense>
          <Suspense fallback={<AccountFallback />}>
            <Account />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
