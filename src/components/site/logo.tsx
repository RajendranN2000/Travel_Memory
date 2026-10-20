import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** public/brand/Logo.png (light theme) is 669 x 373; public/brand/Dark_Logo.png (dark theme) is 800 x 312. */
const LIGHT = { src: "/brand/Logo.png", width: 669, height: 373 };
const DARK = { src: "/brand/Dark_Logo.png", width: 800, height: 312 };

/**
 * Both logos are rendered and CSS shows the one that matches the theme, so there is no flash on load.
 * `alwaysDark` is for screens that are dark in either theme (the reel studio).
 */
function LogoImage({ alt, className, alwaysDark = false, priority = false }: { alt: string; className?: string; alwaysDark?: boolean; priority?: boolean }) {
  return (
    <>
      {alwaysDark ? null : <Image src={LIGHT.src} alt={alt} width={LIGHT.width} height={LIGHT.height} priority={priority} unoptimized className={cn("w-auto dark:hidden", className)} />}
      <Image src={DARK.src} alt={alwaysDark ? alt : ""} aria-hidden={alwaysDark ? undefined : true} width={DARK.width} height={DARK.height} priority={priority} unoptimized className={cn("w-auto", alwaysDark ? "" : "hidden dark:block", className)} />
    </>
  );
}

/** The logo on its own, for tight spots. Size it by height (e.g. h-8); the width follows its ratio. */
export function LogoMark({ className, alwaysDark }: { className?: string; alwaysDark?: boolean }) {
  return <LogoImage alt="" priority alwaysDark={alwaysDark} className={cn("h-10", className)} />;
}

/**
 * The full logo (emblem and name). Size it by height with `markClassName` (e.g. `h-10`);
 * the width follows the image's ratio.
 */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <Link href="/" aria-label="My Travel Memory home" className={cn("group inline-flex min-h-11 items-center rounded-md pr-2", className)}>
      <LogoImage alt="My Travel Memory" priority className={cn("h-11 transition-transform duration-300 ease-out-soft group-hover:scale-[1.03]", markClassName)} />
    </Link>
  );
}
