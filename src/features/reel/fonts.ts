import type { ThemeFontKey } from "@/config/fonts";
import type { ReelProject } from "./types";

const CSS_VAR: Record<ThemeFontKey, string> = {
  fraunces: "--font-app-display",
  "dm-sans": "--font-app-body",
  cormorant: "--font-cormorant",
  "nunito-sans": "--font-nunito-sans",
  "dm-serif": "--font-dm-serif",
  outfit: "--font-outfit",
  playfair: "--font-playfair",
  "source-sans": "--font-source-sans",
  "young-serif": "--font-young-serif",
  "work-sans": "--font-work-sans",
  josefin: "--font-josefin",
  karla: "--font-karla",
  caveat: "--font-caveat",
};

const FALLBACK: Record<ThemeFontKey, string> = {
  fraunces: "Georgia, serif",
  "dm-sans": "system-ui, sans-serif",
  cormorant: "Georgia, serif",
  "nunito-sans": "system-ui, sans-serif",
  "dm-serif": "Georgia, serif",
  outfit: "system-ui, sans-serif",
  playfair: "Georgia, serif",
  "source-sans": "system-ui, sans-serif",
  "young-serif": "Georgia, serif",
  "work-sans": "system-ui, sans-serif",
  josefin: "system-ui, sans-serif",
  karla: "system-ui, sans-serif",
  caveat: "cursive",
};

export const FONT_CHOICES: { key: ThemeFontKey; label: string }[] = [
  { key: "fraunces", label: "Fraunces (display)" },
  { key: "playfair", label: "Playfair Display" },
  { key: "cormorant", label: "Cormorant Garamond" },
  { key: "dm-serif", label: "DM Serif Display" },
  { key: "young-serif", label: "Young Serif" },
  { key: "dm-sans", label: "DM Sans" },
  { key: "outfit", label: "Outfit" },
  { key: "josefin", label: "Josefin Sans" },
  { key: "work-sans", label: "Work Sans" },
  { key: "caveat", label: "Caveat (handwritten)" },
];

/** CSS font-family string for a font key, as loaded by next/font on this page. */
export function fontFamily(key: ThemeFontKey): string {
  if (typeof document === "undefined") return FALLBACK[key];
  const value = getComputedStyle(document.documentElement).getPropertyValue(CSS_VAR[key]).trim();
  return value ? `${value}, ${FALLBACK[key]}` : FALLBACK[key];
}

export function familyMap(keys: Iterable<ThemeFontKey>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = fontFamily(k);
  return out;
}

export function fontsUsed(project: Pick<ReelProject, "overlays">): ThemeFontKey[] {
  return [...new Set(project.overlays.map((o) => o.font))];
}

/**
 * Makes sure the web fonts used by the text are downloaded before drawing, so the
 * canvas doesn't silently fall back to a system font.
 */
export async function loadProjectFonts(project: Pick<ReelProject, "overlays">): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  const jobs: Promise<unknown>[] = [];
  for (const o of project.overlays) {
    const style = `${o.italic ? "italic " : ""}${o.weight} 48px ${fontFamily(o.font)}`;
    jobs.push(document.fonts.load(style, o.text || "Aa").catch(() => undefined));
  }
  await Promise.all(jobs);
}
