/** Canonical unit for the whole page model: millimetres. */
export const MM_PER_INCH = 25.4;
export const PT_PER_MM = 72 / MM_PER_INCH;

export const mmToPt = (mm: number) => mm * PT_PER_MM;
export const ptToMm = (pt: number) => pt / PT_PER_MM;
export const mmToPx = (mm: number, dpi: number) => (mm / MM_PER_INCH) * dpi;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const round = (v: number, places = 3) => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FORMAT_KEYS = ["a4-portrait", "a4-landscape", "a5-portrait", "a5-landscape", "square", "custom"] as const;
export type FormatKey = (typeof FORMAT_KEYS)[number];

export const FORMAT_SIZES: Record<Exclude<FormatKey, "custom">, { label: string; w: number; h: number }> = {
  "a4-portrait": { label: "A4 portrait", w: 210, h: 297 },
  "a4-landscape": { label: "A4 landscape", w: 297, h: 210 },
  "a5-portrait": { label: "A5 portrait", w: 148, h: 210 },
  "a5-landscape": { label: "A5 landscape", w: 210, h: 148 },
  square: { label: "Square 200 mm", w: 200, h: 200 },
};

export const LIMITS = {
  minPageMm: 50,
  maxPageMm: 500,
  maxBleedMm: 10,
  maxPages: 200,
  minElementMm: 4,
} as const;

export interface PageFormat {
  key: FormatKey;
  widthMm: number;
  heightMm: number;
}

export function formatFor(key: FormatKey, custom?: { widthMm: number; heightMm: number }): PageFormat {
  if (key === "custom") {
    return {
      key,
      widthMm: clamp(custom?.widthMm ?? 210, LIMITS.minPageMm, LIMITS.maxPageMm),
      heightMm: clamp(custom?.heightMm ?? 280, LIMITS.minPageMm, LIMITS.maxPageMm),
    };
  }
  const f = FORMAT_SIZES[key];
  return { key, widthMm: f.w, heightMm: f.h };
}

/**
 * Print geometry for a page. Coordinates are millimetres with the origin at the
 * top-left corner of the TRIM box (the finished page), so the bleed sits at negative coordinates.
 */
export interface PageGeometry {
  trim: Rect;
  bleed: Rect;
  /** Where layouts place content */
  content: Rect;
  /** Important text and faces should stay inside this */
  safe: Rect;
}

export function pageGeometry(format: Pick<PageFormat, "widthMm" | "heightMm">, bleedMm: number, marginMm: number, safeMm: number): PageGeometry {
  const w = format.widthMm;
  const h = format.heightMm;
  const inset = (m: number): Rect => ({ x: m, y: m, w: Math.max(1, w - 2 * m), h: Math.max(1, h - 2 * m) });
  return {
    trim: { x: 0, y: 0, w, h },
    bleed: { x: -bleedMm, y: -bleedMm, w: w + 2 * bleedMm, h: h + 2 * bleedMm },
    content: inset(marginMm),
    safe: inset(safeMm),
  };
}

export const rectRight = (r: Rect) => r.x + r.w;
export const rectBottom = (r: Rect) => r.y + r.h;

export function rectContains(outer: Rect, inner: Rect, tolerance = 0.01): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    rectRight(inner) <= rectRight(outer) + tolerance &&
    rectBottom(inner) <= rectBottom(outer) + tolerance
  );
}

export function rectIntersects(a: Rect, b: Rect): boolean {
  return a.x < rectRight(b) && rectRight(a) > b.x && a.y < rectBottom(b) && rectBottom(a) > b.y;
}

/** The part of `inner` that lies outside `outer`, as a fraction of inner's area (0-1). */
export function outsideFraction(outer: Rect, inner: Rect): number {
  const x1 = Math.max(outer.x, inner.x);
  const y1 = Math.max(outer.y, inner.y);
  const x2 = Math.min(rectRight(outer), rectRight(inner));
  const y2 = Math.min(rectBottom(outer), rectBottom(inner));
  const overlap = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const area = inner.w * inner.h;
  return area <= 0 ? 0 : 1 - overlap / area;
}

/** Keeps a rectangle inside `bounds`, shrinking it only if it is larger than the bounds. */
export function fitRectInside(rect: Rect, bounds: Rect): Rect {
  const w = Math.min(rect.w, bounds.w);
  const h = Math.min(rect.h, bounds.h);
  return { x: clamp(rect.x, bounds.x, rectRight(bounds) - w), y: clamp(rect.y, bounds.y, rectBottom(bounds) - h), w, h };
}

export function formatMm(mm: number): string {
  return `${Number.isInteger(mm) ? mm : mm.toFixed(1)} mm`;
}
