import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatDateRange } from "@/lib/dates";
import type { MemoryContent, MemoryPhoto } from "@/features/memories/types";
import { headingClass, themeStyle, treatmentClass } from "@/features/themes/css";
import { ThemeDecoration } from "@/features/themes/decorations";
import { ThemeIllustration } from "@/features/themes/illustration";
import type { ResolvedTheme } from "@/features/themes/registry";

export interface TemplateProps {
  memory: MemoryContent;
  resolved: ResolvedTheme;
  layout: string;
  /** Load the cover image eagerly (published pages); off for thumbnails */
  priority?: boolean;
  /** Approximate rendered width, used to pick image sizes */
  sizesHint?: "full" | "preview" | "thumb";
}

export function TemplateFrame({
  resolved,
  children,
  className,
}: {
  resolved: ResolvedTheme;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      style={themeStyle(resolved)}
      className={cn("@container min-h-full bg-th-bg font-th-body text-th-ink", className)}
      data-destination={resolved.theme.slug}
    >
      {children}
    </div>
  );
}

export function memoryDates(memory: MemoryContent) {
  return formatDateRange(memory.startDate, memory.endDate);
}

export function photoAlt(photo: MemoryPhoto, memory: MemoryContent, index: number): string {
  const parts = [photo.caption, photo.location].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : `Photo ${index + 1} from ${memory.title || "this trip"}`;
}

const sizesFor: Record<NonNullable<TemplateProps["sizesHint"]>, { cover: string; tile: string }> = {
  full: { cover: "100vw", tile: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" },
  preview: { cover: "(min-width: 1024px) 50vw, 100vw", tile: "(min-width: 1024px) 20vw, 50vw" },
  thumb: { cover: "360px", tile: "180px" },
};

export function imageSizes(hint: TemplateProps["sizesHint"], kind: "cover" | "tile") {
  return sizesFor[hint ?? "full"][kind];
}

const SHAPE_RATIO = { landscape: "3 / 2", square: "1 / 1", portrait: "4 / 5" } as const;

/**
 * Inline style for a photo's frame when the user picked a shape for it. Returns
 * undefined for "auto" so the template's own aspect-ratio classes apply.
 */
export function frameStyle(photo: MemoryPhoto | null | undefined): CSSProperties | undefined {
  const shape = photo?.frame?.shape;
  if (!photo || !shape || shape === "auto") return undefined;
  return { aspectRatio: shape === "original" ? `${photo.width} / ${photo.height}` : SHAPE_RATIO[shape] };
}

/** Crop position and zoom chosen for a photo, as inline styles for the <img>. */
export function imageFrameStyle(photo: MemoryPhoto): CSSProperties | undefined {
  const { x = 50, y = 50, zoom = 1 } = photo.frame ?? {};
  if (x === 50 && y === 50 && zoom === 1) return undefined;
  return {
    objectPosition: `${x}% ${y}%`,
    ...(zoom > 1 && { transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` }),
  };
}

/**
 * Renders a photo that fills its positioned parent. Local images go through
 * next/image; remote (signed) URLs and blob previews render as plain <img>.
 * Missing images fall back to the theme illustration.
 */
export function PhotoFill({
  photo,
  alt,
  resolved,
  sizes,
  priority = false,
  className,
  fit = "cover",
}: {
  photo: MemoryPhoto | null | undefined;
  alt: string;
  resolved: ResolvedTheme;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const treatment = treatmentClass(resolved.theme);
  if (!photo?.src) {
    return (
      <ThemeIllustration
        theme={resolved.theme}
        palette={resolved.palette}
        className={cn("absolute inset-0 h-full w-full", className)}
      />
    );
  }
  const fitClass = (photo.frame?.fit ?? fit) === "cover" ? "object-cover" : "object-contain";
  const style = imageFrameStyle(photo);
  if (photo.src.startsWith("/")) {
    return (
      <Image
        src={photo.src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={style}
        className={cn(fitClass, treatment, className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed/blob URLs are not optimisable
    <img
      src={photo.src}
      alt={alt}
      width={photo.width}
      height={photo.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      style={style}
      className={cn("absolute inset-0 h-full w-full", fitClass, treatment, className)}
    />
  );
}

export function TemplateEmptyState({ resolved, className }: { resolved: ResolvedTheme; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 rounded-th border border-dashed border-th-line bg-th-surface/70 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-th">
        <ThemeIllustration theme={resolved.theme} palette={resolved.palette} className="absolute inset-0 h-full w-full" />
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-th-muted">{resolved.theme.copy.emptyState}</p>
    </div>
  );
}

export function SignOff({ resolved, className }: { resolved: ResolvedTheme; className?: string }) {
  return (
    <footer className={cn("flex flex-col items-center gap-4 px-6 py-14 text-center", className)}>
      <ThemeDecoration theme={resolved.theme} index={1} className="w-28 text-th-accent" />
      <p className={cn(headingClass(resolved.theme), "text-xl text-th-primary @2xl:text-2xl")}>{resolved.theme.copy.signOff}</p>
    </footer>
  );
}

export function Caption({ photo, className }: { photo: MemoryPhoto; className?: string }) {
  if (!photo.caption && !photo.location) return null;
  return (
    <figcaption className={cn("mt-2.5 text-sm leading-snug text-th-muted", className)}>
      {photo.caption ? <span className="text-th-ink">{photo.caption}</span> : null}
      {photo.caption && photo.location ? <span aria-hidden> · </span> : null}
      {photo.location ? <span>{photo.location}</span> : null}
    </figcaption>
  );
}
