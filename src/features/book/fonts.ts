import type { FontFamilyKey } from "./types";

/**
 * Fonts are bundled as WOFF files in /fonts/book. The same bytes measure the text
 * (for line breaks), draw it in the editor and are embedded in the exported PDF,
 * so all three agree.
 */
export interface FamilyInfo {
  label: string;
  serif: boolean;
  /** Which of the bundled files exist */
  has: { bold: boolean; italic: boolean; boldItalic: boolean };
  note?: string;
}

export const FAMILIES: Record<FontFamilyKey, FamilyInfo> = {
  "playfair-display": { label: "Playfair Display", serif: true, has: { bold: true, italic: true, boldItalic: true } },
  "cormorant-garamond": { label: "Cormorant Garamond", serif: true, has: { bold: true, italic: true, boldItalic: true } },
  fraunces: { label: "Fraunces", serif: true, has: { bold: true, italic: true, boldItalic: true } },
  lora: { label: "Lora", serif: true, has: { bold: true, italic: true, boldItalic: true } },
  "dm-serif-display": { label: "DM Serif Display", serif: true, has: { bold: false, italic: true, boldItalic: false } },
  "dm-sans": { label: "DM Sans", serif: false, has: { bold: true, italic: true, boldItalic: true } },
  "source-sans-3": { label: "Source Sans 3", serif: false, has: { bold: true, italic: true, boldItalic: true } },
  "josefin-sans": { label: "Josefin Sans", serif: false, has: { bold: true, italic: true, boldItalic: true } },
  outfit: { label: "Outfit", serif: false, has: { bold: true, italic: false, boldItalic: false } },
  caveat: { label: "Caveat (handwritten)", serif: false, has: { bold: true, italic: false, boldItalic: false } },
};

export const FAMILY_KEYS = Object.keys(FAMILIES) as FontFamilyKey[];

export interface ResolvedFont {
  family: FontFamilyKey;
  /** The face that really exists; a missing bold or italic falls back rather than being faked */
  bold: boolean;
  italic: boolean;
  /** File name without extension, e.g. "playfair-display-700-italic" */
  file: string;
  /** Name used for the browser FontFace and the SVG font-family */
  cssFamily: string;
}

export function resolveFont(family: FontFamilyKey, bold: boolean, italic: boolean): ResolvedFont {
  const info = FAMILIES[family] ?? FAMILIES["dm-sans"];
  const key = FAMILIES[family] ? family : "dm-sans";
  const b = bold && info.has.bold;
  let i = italic && info.has.italic;
  if (b && i && !info.has.boldItalic) i = false;
  const file = `${key}-${b ? 700 : 400}-${i ? "italic" : "normal"}`;
  return { family: key, bold: b, italic: i, file, cssFamily: `TMS ${info.label.replace(/ \(.*\)/, "")} ${b ? "Bold" : "Regular"}${i ? " Italic" : ""}` };
}

/** True when the requested style can be shown exactly as asked. */
export function styleAvailable(family: FontFamilyKey, bold: boolean, italic: boolean): { bold: boolean; italic: boolean } {
  const r = resolveFont(family, bold, italic);
  return { bold: r.bold === bold || !bold, italic: r.italic === italic || !italic };
}

export const fontUrl = (file: string) => `/fonts/book/${file}.woff`;

/** What the measuring and drawing code needs from a loaded font. */
export interface LoadedFont {
  resolved: ResolvedFont;
  bytes: Uint8Array;
  unitsPerEm: number;
  /** Ascent and descent as fractions of the font size (descent is positive) */
  ascent: number;
  descent: number;
  /** Advance width of `text` in font units, kerning included */
  advance(text: string): number;
  hasGlyph(codePoint: number): boolean;
}

type FontkitFont = {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  layout(text: string): { advanceWidth: number };
  hasGlyphForCodePoint(cp: number): boolean;
};

export type FetchBytes = (url: string) => Promise<Uint8Array>;

const defaultFetch: FetchBytes = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`The font file ${url} couldn't be loaded.`);
  return new Uint8Array(await res.arrayBuffer());
};

/** Loads fonts once and serves them synchronously afterwards. */
export class FontStore {
  private fonts = new Map<string, LoadedFont>();
  private pending = new Map<string, Promise<LoadedFont>>();
  private widthCache = new Map<string, number>();
  private fontkit: { create(bytes: Uint8Array): FontkitFont } | null = null;
  private failed = new Set<string>();

  constructor(private fetchBytes: FetchBytes = defaultFetch) {}

  private async kit() {
    if (!this.fontkit) {
      const mod = (await import("@pdf-lib/fontkit")) as unknown as { default?: { create(b: Uint8Array): FontkitFont }; create?: (b: Uint8Array) => FontkitFont };
      this.fontkit = (mod.default ?? mod) as { create(bytes: Uint8Array): FontkitFont };
    }
    return this.fontkit;
  }

  has(file: string) {
    return this.fonts.has(file);
  }

  isMissing(file: string) {
    return this.failed.has(file);
  }

  get(resolved: ResolvedFont): LoadedFont | null {
    return this.fonts.get(resolved.file) ?? null;
  }

  async load(resolved: ResolvedFont): Promise<LoadedFont | null> {
    const existing = this.fonts.get(resolved.file);
    if (existing) return existing;
    let p = this.pending.get(resolved.file);
    if (!p) {
      p = (async () => {
        const kit = await this.kit();
        const bytes = await this.fetchBytes(fontUrl(resolved.file));
        const font = kit.create(bytes);
        const loaded: LoadedFont = {
          resolved,
          bytes,
          unitsPerEm: font.unitsPerEm,
          ascent: font.ascent / font.unitsPerEm,
          descent: Math.abs(font.descent) / font.unitsPerEm,
          advance: (text) => font.layout(text).advanceWidth,
          hasGlyph: (cp) => font.hasGlyphForCodePoint(cp),
        };
        this.fonts.set(resolved.file, loaded);
        return loaded;
      })();
      this.pending.set(resolved.file, p);
      p.catch(() => {
        this.failed.add(resolved.file);
        this.pending.delete(resolved.file);
      });
    }
    try {
      return await p;
    } catch {
      return null;
    }
  }

  /** Registers the font with the browser so SVG and canvas can draw it. */
  async register(resolved: ResolvedFont): Promise<void> {
    const loaded = await this.load(resolved);
    if (!loaded || typeof document === "undefined" || typeof FontFace === "undefined") return;
    const family = resolved.cssFamily;
    for (const face of document.fonts) if (face.family === family) return;
    const face = new FontFace(family, loaded.bytes.slice().buffer as ArrayBuffer, {
      weight: resolved.bold ? "700" : "400",
      style: resolved.italic ? "italic" : "normal",
    });
    await face.load();
    document.fonts.add(face);
  }

  /** Width of `text` in points at `sizePt`, with `trackingPt` added after each character. */
  width(resolved: ResolvedFont, text: string, sizePt: number, trackingPt: number): number {
    const font = this.fonts.get(resolved.file);
    if (!font) return text.length * sizePt * 0.5 + text.length * trackingPt;
    const key = `${resolved.file}|${text}`;
    let units = this.widthCache.get(key);
    if (units === undefined) {
      units = font.advance(text);
      if (this.widthCache.size > 20000) this.widthCache.clear();
      this.widthCache.set(key, units);
    }
    return (units / font.unitsPerEm) * sizePt + [...text].length * trackingPt;
  }

  metrics(resolved: ResolvedFont): { ascent: number; descent: number } {
    const f = this.fonts.get(resolved.file);
    return f ? { ascent: f.ascent, descent: f.descent } : { ascent: 0.9, descent: 0.25 };
  }

  hasGlyph(resolved: ResolvedFont, codePoint: number): boolean {
    const f = this.fonts.get(resolved.file);
    return f ? f.hasGlyph(codePoint) : true;
  }
}
