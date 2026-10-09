"use client";

import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOut } from "@/features/auth/actions";
import { CreateCta, NavLinks } from "./nav-links";

export interface HeaderUser {
  displayName: string | null;
  email: string | null;
}

export function MobileNav({ user }: { user: HeaderUser | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,88vw)] bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Menu</SheetTitle>
          <SheetDescription className={user ? "truncate" : "sr-only"}>
            {user ? `Signed in as ${user.displayName ?? user.email ?? "traveller"}` : "Site navigation"}
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="px-2">
          <NavLinks className="flex flex-col gap-1 [&_a]:w-full [&_a]:text-lg" onNavigate={() => setOpen(false)} />
          {user ? (
            <ul className="mt-1 flex flex-col gap-1">
              <li>
                <SheetClose asChild>
                  <Link href="/settings" className="inline-flex min-h-11 w-full items-center rounded-md px-3 text-lg text-foreground/75 hover:text-foreground">
                    Settings
                  </Link>
                </SheetClose>
              </li>
            </ul>
          ) : null}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t p-4">
          {user ? (
            <form action={signOut}>
              <Button type="submit" variant="outline" size="lg" className="w-full">
                <LogOut /> Sign out
              </Button>
            </form>
          ) : (
            <SheetClose asChild>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </SheetClose>
          )}
          <CreateCta className="h-11 px-6" onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
