import { describe, expect, it } from "vitest";
import { themeFonts } from "@/config/fonts";
import { fallbackTheme } from "@/config/themes";
import { contrastRatio, themeStyle } from "@/features/themes/css";
import { getDestinationImage } from "@/features/themes/images";
import { listDestinationThemes, resolveTheme } from "@/features/themes/registry";
import { getTemplate } from "@/features/templates/registry";

const themes = listDestinationThemes();

describe("destination theme configuration", () => {
  it("provides the five Phase 1 destinations with unique slugs", () => {
    expect(themes.map((t) => t.slug)).toEqual(["munnar", "goa", "ooty", "wayanad", "manali"]);
  });

  describe.each(themes.map((t) => [t.slug, t] as const))("%s", (_slug, theme) => {
    it("has a complete identity", () => {
      expect(theme.palettes.length).toBeGreaterThanOrEqual(1);
      expect(new Set(theme.palettes.map((p) => p.key)).size).toBe(theme.palettes.length);
      expect(theme.decorations.length).toBeGreaterThan(0);
      expect(theme.imageTreatment).not.toBe("none");
      expect(themeFonts[theme.typography.heading]).toBeDefined();
      expect(themeFonts[theme.typography.body]).toBeDefined();
      expect(theme.copy.summary.length).toBeGreaterThan(40);
    });

    it("references only known templates", () => {
      for (const slug of theme.templates) expect(getTemplate(slug)).not.toBeNull();
    });

    it("references photography with licence metadata", () => {
      for (const key of [theme.heroImage, ...theme.galleryImages]) {
        const img = getDestinationImage(key);
        expect(img, key).not.toBeNull();
        expect(img?.alt.length).toBeGreaterThan(10);
        expect(img?.source?.license).toMatch(/^(CC0|Public domain|CC BY)/);
        expect(img?.source?.author).toBeTruthy();
      }
    });

    it.each(theme.palettes.map((p) => [p.key, p] as const))("palette %s meets WCAG AA text contrast", (_key, p) => {
      expect(contrastRatio(p.ink, p.bg)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(p.ink, p.surface)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
      // Headings are drawn in the primary colour.
      expect(contrastRatio(p.primary, p.bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe("resolveTheme", () => {
  it("falls back to the neutral theme for unknown destinations", () => {
    const resolved = resolveTheme("atlantis");
    expect(resolved.isFallback).toBe(true);
    expect(resolved.theme).toBe(fallbackTheme);
    expect(resolved.hero).toBeNull();
  });

  it("falls back to the default palette for unknown palette keys", () => {
    const resolved = resolveTheme("goa", "neon-pink");
    expect(resolved.palette.key).toBe("sunset-shack");
  });

  it("selects a requested palette", () => {
    expect(resolveTheme("manali", "snowline").palette.key).toBe("snowline");
  });

  it("produces CSS variables for every token", () => {
    const style = themeStyle(resolveTheme("ooty")) as Record<string, string>;
    for (const token of ["--t-bg", "--t-ink", "--t-primary", "--t-font-heading", "--t-radius"]) {
      expect(style[token]).toBeTruthy();
    }
  });
});
