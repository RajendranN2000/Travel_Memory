"use client";

import { BookOpen, ChevronRight, Clapperboard, Images, LayoutTemplate, LogOut, MapPin, Menu, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { CreateCta, primaryNav } from "./nav-links";
import { SocialLinks } from "./social-links";
import { UserAvatar, type AvatarUser } from "./user-avatar";

export type HeaderUser = AvatarUser;

const ICONS: Record<string, LucideIcon> = {
  "/destinations": MapPin,
  "/templates": LayoutTemplate,
  "/reels": Clapperboard,
  "/photo-books": BookOpen,
  "/my-memories": Images,
};

function isActive(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

function Row({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-13 items-center gap-3 rounded-xl px-3 text-[1.05rem] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-primary/10 font-medium text-foreground" : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground",
        )}
      >
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg transition-colors", active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70 group-hover:bg-card")}>
          <Icon aria-hidden className="size-[1.1rem]" />
        </span>
        <span className="flex-1">{label}</span>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </SheetClose>
  );
}

export function MobileNav({ user }: { user: HeaderUser | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,90vw)] gap-0 bg-background p-0">
        <SheetHeader className="gap-3 border-b border-border/70 px-4 pt-4 pb-4">
          {/* The logo is the title; the words are kept for screen readers. */}
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
          <div onClick={() => setOpen(false)}>
            <Logo markClassName="h-10" />
          </div>
          {user ? (
            <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
              <UserAvatar user={user} className="size-11" />
              <div className="min-w-0 text-sm">
                {user.displayName ? <span className="block truncate font-semibold text-foreground">{user.displayName}</span> : null}
                <span className="block truncate text-muted-foreground">{user.email ?? "Signed in"}</span>
              </div>
            </div>
          ) : null}
        </SheetHeader>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="flex flex-col gap-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Row href={item.href} label={item.label === "Books" ? "Photo books" : item.label} icon={ICONS[item.href] ?? Images} active={isActive(pathname, item.href)} />
              </li>
            ))}
            {user ? (
              <li className="mt-2 border-t border-border/70 pt-2">
                <Row href="/settings" label="Settings" icon={Settings} active={isActive(pathname, "/settings")} />
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="mt-auto space-y-3 border-t border-border/70 bg-card/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <CreateCta className="h-12 w-full text-base" onNavigate={() => setOpen(false)} />
          {user ? (
            <form action={signOut}>
              <Button type="submit" variant="outline" size="lg" className="w-full">
                <LogOut /> Sign out
              </Button>
            </form>
          ) : (
            <SheetClose asChild>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/login">Sign in</Link>
              </Button>
            </SheetClose>
          )}
          <SocialLinks className="justify-center pt-1" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
