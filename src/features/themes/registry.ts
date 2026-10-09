import { destinationThemes, fallbackTheme } from "@/config/themes";
import { getDestinationImage, getDestinationImages } from "./images";
import type { DestinationTheme, ImageAsset, ThemePalette } from "./types";

const bySlug = new Map(destinationThemes.map((theme) => [theme.slug, theme]));

export function listDestinationThemes(): DestinationTheme[] {
  return destinationThemes;
}

export function getDestinationTheme(slug: string | null | undefined): DestinationTheme | null {
  if (!slug) return null;
  return bySlug.get(slug) ?? null;
}

export function isKnownDestination(slug: string): boolean {
  return bySlug.has(slug);
}

export interface ResolvedTheme {
  theme: DestinationTheme;
  palette: ThemePalette;
  hero: ImageAsset | null;
  gallery: ImageAsset[];
  /** True when the requested destination was unknown and the fallback was used */
  isFallback: boolean;
}

/**
 * Resolves a destination slug and optional palette key to a complete theme.
 * Unknown slugs, unknown palettes and missing photography all degrade
 * gracefully to sensible defaults rather than throwing.
 */
export function resolveTheme(slug: string | null | undefined, paletteKey?: string | null): ResolvedTheme {
  const found = getDestinationTheme(slug);
  const theme = found ?? fallbackTheme;
  const palette = theme.palettes.find((p) => p.key === paletteKey) ?? theme.palettes[0];
  return {
    theme,
    palette,
    hero: getDestinationImage(theme.heroImage),
    gallery: getDestinationImages(theme.galleryImages),
    isFallback: !found,
  };
}
