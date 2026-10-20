"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const primaryNav = [
  { href: "/destinations", label: "Destinations" },
  { href: "/templates", label: "Templates" },
  { href: "/reels", label: "Reels" },
  { href: "/photo-books", label: "Books" },
  { href: "/my-memories", label: "My memories" },
] as const;

function isActive(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

export function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className={className}>
      {primaryNav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-foreground transition-all duration-300 hover:bg-foreground/[0.07]",
                active && "bg-gradient-to-r from-[#d9552b] via-[#e8742f] to-[#f2a93b] text-white shadow-[0_6px_16px_-6px_rgba(217,85,43,0.65)] hover:bg-transparent",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The header's call to action, hidden while the visitor is already creating a memory. */
export function CreateCta({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  if (isActive(pathname, "/create")) return null;
  return (
    <Button asChild className={className}>
      <Link href="/create" onClick={onNavigate}>
        Create your memory
      </Link>
    </Button>
  );
}

/** Static fallback rendered while the pathname is unknown during prerendering. */
export function NavLinksFallback({ className }: { className?: string }) {
  return (
    <ul className={className}>
      {primaryNav.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-foreground hover:bg-foreground/[0.07]"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
