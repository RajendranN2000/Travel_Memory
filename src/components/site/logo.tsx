import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden focusable={false} className={cn("size-8", className)}>
      <rect x="3" y="5" width="26" height="22" rx="3" fill="var(--primary)" />
      <circle cx="21.5" cy="12" r="3.2" fill="var(--brand)" />
      <path d="M3 22.5 L11 14.5 L16 19.5 L19.5 16 L29 24.5 V24 A3 3 0 0 1 26 27 H6 A3 3 0 0 1 3 24 Z" fill="var(--paper)" opacity="0.92" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex min-h-11 items-center gap-2.5 rounded-md pr-2 font-display text-[1.15rem] tracking-tight", className)}
    >
      <LogoMark className="transition-transform duration-300 ease-out-soft group-hover:-rotate-3" />
      <span className="leading-none">
        Travel Memory <span className="italic text-brand">Studio</span>
      </span>
    </Link>
  );
}
