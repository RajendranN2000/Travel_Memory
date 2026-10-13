import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Height of public/brand/logo-full.png at its stored width of 720px. */
const LOGO_HEIGHT = 221;

/** Size the emblem by height (e.g. `h-8`); the width follows its 242:192 ratio. */
export function LogoMark({ className }: { className?: string }) {
  return <Image src="/brand/logo-mark.png" alt="" width={242} height={192} priority unoptimized className={cn("h-10 w-auto", className)} />;
}

/**
 * The full logo (emblem and name, from public/brand/Logo.png). Size it by height
 * with `markClassName` (e.g. `h-10`); the width follows the image's ratio.
 */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <Link href="/" aria-label="My Travel Memory home" className={cn("group inline-flex min-h-11 items-center rounded-md pr-2", className)}>
      <Image
        src="/brand/logo-full.png"
        alt="My Travel Memory"
        width={720}
        height={LOGO_HEIGHT}
        priority
        unoptimized
        className={cn("h-11 w-auto transition-transform duration-300 ease-out-soft group-hover:scale-[1.03]", markClassName)}
      />
    </Link>
  );
}
