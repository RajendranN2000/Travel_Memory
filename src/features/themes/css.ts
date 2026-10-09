import type { CSSProperties } from "react";
import { themeFonts } from "@/config/fonts";
import type { ResolvedTheme } from "./registry";
import type { DestinationTheme } from "./types";

const radii: Record<DestinationTheme["radius"], string> = {
  square: "2px",
  soft: "8px",
  round: "18px",
};

/** Maps a resolved theme to the CSS custom properties consumed by `t-*` utilities. */
export function themeStyle({ theme, palette }: Pick<ResolvedTheme, "theme" | "palette">): CSSProperties {
  const { typography } = theme;
  return {
    "--t-bg": palette.bg,
    "--t-surface": palette.surface,
    "--t-ink": palette.ink,
    "--t-muted": palette.muted,
    "--t-primary": palette.primary,
    "--t-on-primary": palette.onPrimary,
    "--t-secondary": palette.secondary,
    "--t-accent": palette.accent,
    "--t-line": palette.line,
    "--t-font-heading": themeFonts[typography.heading],
    "--t-font-body": themeFonts[typography.body],
    "--t-font-script": themeFonts[typography.script ?? typography.body],
    "--t-heading-weight": String(typography.headingWeight),
    "--t-radius": radii[theme.radius],
  } as CSSProperties;
}

/** Class names that express a theme's heading personality. */
export function headingClass(theme: DestinationTheme): string {
  const { typography } = theme;
  return [
    "font-th-heading [font-weight:var(--t-heading-weight)]",
    typography.headingCase === "uppercase" ? "uppercase" : "",
    typography.headingTracking === "wide"
      ? "tracking-[0.08em]"
      : typography.headingTracking === "tight"
        ? "tracking-[-0.01em]"
        : "",
    typography.headingStyle === "italic" ? "italic" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function treatmentClass(theme: DestinationTheme): string {
  return theme.imageTreatment === "none" ? "" : `treat-${theme.imageTreatment}`;
}

/** Relative luminance per WCAG 2.x. */
export function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function isDarkPalette(bg: string): boolean {
  return luminance(bg) < 0.2;
}
