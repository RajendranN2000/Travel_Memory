import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { headingClass, themeStyle, treatmentClass } from "@/features/themes/css";
import { ThemeIllustration } from "@/features/themes/illustration";
import { resolveTheme } from "@/features/themes/registry";
import type { DestinationTheme } from "@/features/themes/types";

export function PaletteSwatches({ theme, className }: { theme: DestinationTheme; className?: string }) {
  const p = theme.palettes[0];
  return (
    <span className={cn("flex items-center", className)} aria-hidden>
      {[p.primary, p.accent, p.secondary, p.bg].map((color, i) => (
        <span
          key={color + i}
          className="-ml-1 size-4 rounded-full border border-black/10 first:ml-0"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

export function DestinationCard({
  theme,
  className,
  aspect = "aspect-[3/4]",
  sizes = "(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw",
}: {
  theme: DestinationTheme;
  className?: string;
  aspect?: string;
  sizes?: string;
}) {
  const resolved = resolveTheme(theme.slug);
  const hero = resolved.hero;
  return (
    <Link
      href={`/destinations/${theme.slug}`}
      style={themeStyle(resolved)}
      className={cn(
        "group relative isolate flex flex-col justify-end overflow-hidden rounded-lg bg-th-primary text-white shadow-soft lift focus-visible:outline-offset-4",
        aspect,
        className,
      )}
    >
      {hero ? (
        <Image
          src={hero.src}
          alt=""
          fill
          sizes={sizes}
          placeholder={hero.blurDataURL ? "blur" : "empty"}
          blurDataURL={hero.blurDataURL}
          className={cn(
            "-z-10 object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]",
            treatmentClass(theme),
          )}
        />
      ) : (
        <ThemeIllustration theme={theme} palette={resolved.palette} className="absolute inset-0 -z-10 h-full w-full" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="p-5">
        <p className="eyebrow text-white/80">{theme.region}</p>
        <h3 className={cn(headingClass(theme), "mt-1 text-[2rem] leading-none")}>{theme.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-snug text-white/85">{theme.copy.tagline}</p>
        <div className="mt-4 flex items-center justify-between">
          <PaletteSwatches theme={theme} />
          <ArrowUpRight
            aria-hidden
            className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </div>
      </div>
    </Link>
  );
}
