import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Size the emblem by height (e.g. `h-8`); the width follows its 242:192 ratio. */
export function LogoMark({ className }: { className?: string }) {
  return <Image src="/brand/logo-mark.png" alt="" width={242} height={192} priority unoptimized className={cn("h-10 w-auto", className)} />;
}

/** The full stacked logo with the TRAVEL MEMORY wordmark. */
export function LogoFull({ className }: { className?: string }) {
  return <Image src="/brand/logo.png" alt="Travel Memory" width={720} height={773} unoptimized className={cn("h-auto w-40", className)} />;
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex min-h-11 items-center gap-2.5 rounded-md pr-2 font-display text-[1.15rem] tracking-tight", className)}
    >
      <LogoMark className={cn("transition-transform duration-300 ease-out-soft group-hover:-rotate-3", markClassName)} />
      <span className="leading-none">
        Travel Memory <span className="italic text-brand">Studio</span>
      </span>
    </Link>
  );
}
