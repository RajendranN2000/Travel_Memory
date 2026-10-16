import { DEFAULT_FILTER } from "./filters";
import type { BookPage, BookTheme, ImageElement, PageBackground, PageKind, ShapeElement, TextElement, TextRole, TextStyle } from "./types";
import { clamp, type Rect } from "./units";

let counter = 0;
let deterministic = false;

/**
 * Runs `fn` with predictable ids and timestamps. Template previews are drawn while the page is
 * rendered on the server, where random values are not allowed, and they never need to be unique.
 */
export function withDeterministicIds<T>(fn: () => T): T {
  const before = { counter, deterministic };
  deterministic = true;
  counter = 0;
  try {
    return fn();
  } finally {
    counter = before.counter;
    deterministic = before.deterministic;
  }
}

/** The current time, or a fixed one while building previews. */
export function nowMs(): number {
  return deterministic ? 0 : Date.now();
}

export function newId(prefix: string): string {
  counter += 1;
  if (deterministic) return `${prefix}_d${counter}`;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}${counter.toString(36)}`;
}

export type ColorToken = "ink" | "paper" | "muted" | "accent" | "accent2" | "white" | "black";

export function resolveColor(token: ColorToken | string, theme: BookTheme): string {
  switch (token) {
    case "ink":
      return theme.ink;
    case "paper":
      return theme.paper;
    case "muted":
      return theme.muted;
    case "accent":
      return theme.accent;
    case "accent2":
      return theme.accent2;
    case "white":
      return "#ffffff";
    case "black":
      return "#000000";
    default:
      return token;
  }
}

/** Typography scale for a page of this width (A4 = 1). */
export function scaleFor(widthMm: number, heightMm: number): { k: number; kb: number } {
  const short = Math.min(widthMm, heightMm);
  const k = clamp(short / 210, 0.6, 1.5);
  return { k, kb: clamp(0.85 + (k - 0.7) * 0.4, 0.85, 1.15) };
}

export function roleStyle(role: TextRole, theme: BookTheme, k: number, kb: number): TextStyle {
  const base: TextStyle = {
    font: theme.bodyFont,
    sizePt: 10 * kb,
    bold: false,
    italic: false,
    color: theme.ink,
    align: "left",
    lineHeight: 1.5,
    trackingPt: 0,
    paraSpacingPt: 5 * kb,
    uppercase: false,
  };
  switch (role) {
    case "title":
      return { ...base, font: theme.headingFont, sizePt: 34 * k, bold: theme.headingBold, italic: theme.headingItalic, lineHeight: 1.08, paraSpacingPt: 0 };
    case "heading":
      return { ...base, font: theme.headingFont, sizePt: 21 * k, bold: theme.headingBold, italic: theme.headingItalic, lineHeight: 1.18, paraSpacingPt: 0 };
    case "subtitle":
      return { ...base, sizePt: 13 * k, color: theme.muted, lineHeight: 1.3, paraSpacingPt: 0 };
    case "caption":
      return { ...base, sizePt: 8.5 * kb, italic: true, color: theme.muted, lineHeight: 1.4, paraSpacingPt: 2 };
    case "quote":
      return { ...base, font: theme.headingFont, sizePt: 22 * k, italic: true, color: theme.ink, lineHeight: 1.3, align: "center", paraSpacingPt: 0 };
    case "label":
      return { ...base, font: theme.labelFont, sizePt: 7.5 * kb, bold: true, color: theme.accent, uppercase: true, trackingPt: 2, lineHeight: 1.3, paraSpacingPt: 0 };
    case "meta":
      return { ...base, font: theme.labelFont, sizePt: 7.5 * kb, color: theme.muted, uppercase: true, trackingPt: 1.4, lineHeight: 1.3, paraSpacingPt: 0 };
    case "folio":
      return { ...base, font: theme.labelFont, sizePt: 8 * kb, color: theme.muted, align: "center", lineHeight: 1.2, trackingPt: 0.6, paraSpacingPt: 0 };
    default:
      return base;
  }
}

export function makeText(role: TextRole, frame: Rect, text: string, style: TextStyle, extra: Partial<TextElement> = {}): TextElement {
  return {
    id: newId("t"),
    type: "text",
    role,
    frame,
    text,
    style,
    columns: 1,
    columnGapMm: 6,
    paddingMm: 0,
    valign: "top",
    field: "none",
    opacity: 1,
    ...extra,
  };
}

export function makeImage(frame: Rect, sourceId: string | null, extra: Partial<ImageElement> = {}): ImageElement {
  return {
    id: newId("i"),
    type: "image",
    sourceId,
    frame,
    mode: "contain",
    focusX: 0.5,
    focusY: 0.5,
    zoom: 1,
    crop: null,
    coverPage: false,
    fullBleed: false,
    borderMm: 0,
    borderColor: "#ffffff",
    radiusMm: 0,
    shadow: false,
    opacity: 1,
    filter: { ...DEFAULT_FILTER },
    alt: "",
    ...extra,
  };
}

export function makeShape(shape: ShapeElement["shape"], frame: Rect, extra: Partial<ShapeElement> = {}): ShapeElement {
  return { id: newId("s"), type: "shape", shape, frame, fill: null, stroke: null, strokeMm: 0.3, radiusMm: 0, opacity: 1, ...extra };
}

export function makePage(kind: PageKind, theme: BookTheme, extra: Partial<BookPage> = {}): BookPage {
  const background: PageBackground = { color: theme.paper, imageId: null, pattern: "none" };
  return { id: newId("p"), kind, layoutKey: null, section: "", background, elements: [], unplaced: [], fullBleed: false, ...extra };
}
