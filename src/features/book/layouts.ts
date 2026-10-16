import { makeImage, makeShape, makeText, resolveColor, roleStyle, scaleFor, type ColorToken } from "./elements";
import type { BookElement, BookPage, BookSettings, BookTheme, FitMode, ImageElement, PageKind, ShapeElement, TextAlign, TextElement, TextRole } from "./types";
import { containRect, type SourceSize } from "./image-fit";
import { pageGeometry, type PageGeometry, type Rect } from "./units";

export interface ImageSlot {
  kind: "image";
  frame: Rect;
  mode?: FitMode;
  coverPage?: boolean;
  fullBleed?: boolean;
  radiusMm?: number;
  shadow?: boolean;
  borderMm?: number;
  borderColor?: ColorToken;
  background?: ColorToken;
}

export interface TextSlot {
  kind: "text";
  role: TextRole;
  frame: Rect;
  color?: ColorToken;
  align?: TextAlign;
  /** Multiplies the role's default size */
  sizeMul?: number;
  columns?: number;
  valign?: "top" | "middle" | "bottom";
  paddingMm?: number;
  uppercase?: boolean;
  italic?: boolean;
  font?: "heading" | "body" | "script" | "label";
  field?: "pageNumber" | "none";
  background?: ColorToken;
  tracking?: number;
}

export interface ShapeSlot {
  kind: "shape";
  shape: ShapeElement["shape"];
  frame: Rect;
  fill?: ColorToken;
  stroke?: ColorToken;
  strokeMm?: number;
  opacity?: number;
}

export type Slot = ImageSlot | TextSlot | ShapeSlot;

export interface LayoutCtx {
  geom: PageGeometry;
  theme: BookTheme;
  settings: BookSettings;
  k: number;
  kb: number;
  landscape: boolean;
  /** Spacing between neighbouring frames in mm */
  gap: number;
}

export interface LayoutResult {
  slots: Slot[];
  /** Page background colour token */
  background?: ColorToken;
  fullBleed?: boolean;
}

export type LayoutGroup = "cover" | "photos" | "text" | "special";

export interface LayoutDef {
  key: string;
  name: string;
  description: string;
  group: LayoutGroup;
  imageSlots: number;
  kinds: PageKind[];
  build(ctx: LayoutCtx): LayoutResult;
}

export function layoutCtx(theme: BookTheme, settings: BookSettings): LayoutCtx {
  const geom = pageGeometry({ widthMm: settings.widthMm, heightMm: settings.heightMm }, settings.bleedMm, settings.marginMm, settings.safeMm);
  const { k, kb } = scaleFor(settings.widthMm, settings.heightMm);
  return { geom, theme, settings, k, kb, landscape: settings.widthMm > settings.heightMm, gap: 4 * k };
}

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const img = (frame: Rect, extra: Partial<ImageSlot> = {}): ImageSlot => ({ kind: "image", frame, ...extra });
const txt = (role: TextRole, frame: Rect, extra: Partial<TextSlot> = {}): TextSlot => ({ kind: "text", role, frame, ...extra });
const shp = (shape: ShapeSlot["shape"], frame: Rect, extra: Partial<ShapeSlot> = {}): ShapeSlot => ({ kind: "shape", shape, frame, ...extra });

/** Splits `rect` into equal columns/rows. */
function grid(rect: Rect, cols: number, rows: number, gap: number): Rect[] {
  const cw = (rect.w - gap * (cols - 1)) / cols;
  const ch = (rect.h - gap * (rows - 1)) / rows;
  const out: Rect[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) out.push(r(rect.x + col * (cw + gap), rect.y + row * (ch + gap), cw, ch));
  return out;
}

const L: LayoutDef[] = [];
const def = (d: LayoutDef) => L.push(d);

// -- covers -------------------------------------------------------------------

def({
  key: "cover-photo",
  name: "Photo cover",
  description: "A full-page photo with the title over it.",
  group: "cover",
  imageSlots: 1,
  kinds: ["cover"],
  build: ({ geom, k }) => {
    const { trim, bleed, content: c } = geom;
    return {
      fullBleed: true,
      slots: [
        img(bleed, { mode: "full-page", coverPage: true, fullBleed: true }),
        shp("rect", trim, { fill: "black", opacity: 0.28 }),
        txt("label", r(c.x, c.y, c.w, 8 * k), { color: "white" }),
        txt("title", r(c.x, trim.h * 0.5, c.w, trim.h * 0.3), { color: "white", valign: "bottom", sizeMul: 1.25 }),
        txt("subtitle", r(c.x, trim.h * 0.82, c.w, 14 * k), { color: "white" }),
      ],
    };
  },
});

def({
  key: "cover-magazine",
  name: "Magazine cover",
  description: "Masthead, big photo, cover lines and issue details.",
  group: "cover",
  imageSlots: 1,
  kinds: ["cover"],
  build: ({ geom, k }) => {
    const { trim, bleed, content: c } = geom;
    return {
      fullBleed: true,
      slots: [
        img(bleed, { mode: "full-page", coverPage: true, fullBleed: true }),
        shp("rect", r(trim.x, trim.y, trim.w, trim.h * 0.2), { fill: "black", opacity: 0.22 }),
        txt("meta", r(c.x, c.y - 2, c.w, 6 * k), { color: "white", align: "center" }),
        txt("title", r(c.x, c.y + 6 * k, c.w, trim.h * 0.14), { color: "white", align: "center", uppercase: true, sizeMul: 1.5, tracking: 3, valign: "middle" }),
        shp("rect", r(trim.x, trim.h * 0.68, trim.w, trim.h * 0.32), { fill: "black", opacity: 0.35 }),
        txt("subtitle", r(c.x, trim.h * 0.72, c.w * 0.8, trim.h * 0.12), { color: "white", sizeMul: 1.4, font: "heading" }),
        txt("caption", r(c.x, trim.h * 0.85, c.w * 0.8, trim.h * 0.1), { color: "white", italic: false }),
      ],
    };
  },
});

def({
  key: "cover-minimal",
  name: "Minimal cover",
  description: "One framed photo, lots of white space.",
  group: "cover",
  imageSlots: 1,
  kinds: ["cover"],
  build: ({ geom, k }) => {
    const { trim, content: c } = geom;
    const w = c.w * 0.72;
    return {
      slots: [
        txt("label", r(c.x, c.y, c.w, 8 * k), { align: "center" }),
        img(r(trim.w / 2 - w / 2, c.y + 14 * k, w, trim.h * 0.5), { mode: "contain" }),
        txt("title", r(c.x, trim.h * 0.74, c.w, 28 * k), { align: "center", sizeMul: 0.9 }),
        txt("subtitle", r(c.x, trim.h * 0.74 + 28 * k, c.w, 12 * k), { align: "center" }),
      ],
    };
  },
});

def({
  key: "title-page",
  name: "Title page",
  description: "Centred title, subtitle and a rule.",
  group: "special",
  imageSlots: 0,
  kinds: ["title"],
  build: ({ geom, k }) => {
    const { trim, content: c } = geom;
    return {
      slots: [
        txt("label", r(c.x, trim.h * 0.34, c.w, 8 * k), { align: "center" }),
        txt("title", r(c.x, trim.h * 0.38, c.w, trim.h * 0.2), { align: "center", valign: "middle" }),
        shp("line", r(trim.w / 2 - 12 * k, trim.h * 0.6, 24 * k, 1), { stroke: "accent", strokeMm: 0.4 }),
        txt("subtitle", r(c.x, trim.h * 0.63, c.w, 20 * k), { align: "center" }),
      ],
    };
  },
});

def({
  key: "dedication",
  name: "Dedication",
  description: "A short dedication in the middle of the page.",
  group: "special",
  imageSlots: 0,
  kinds: ["dedication"],
  build: ({ geom }) => {
    const { content: c, trim } = geom;
    return { slots: [txt("quote", r(c.x + c.w * 0.1, trim.h * 0.38, c.w * 0.8, trim.h * 0.24), { valign: "middle", sizeMul: 0.8 })] };
  },
});

// -- photo pages ----------------------------------------------------------------

def({
  key: "photo-title",
  name: "Large photo and title",
  description: "One big photo with a title underneath.",
  group: "photos",
  imageSlots: 1,
  kinds: ["content", "intro"],
  build: ({ geom, k, gap }) => {
    const c = geom.content;
    const ph = c.h * 0.74;
    return {
      slots: [
        img(r(c.x, c.y, c.w, ph), { mode: "contain" }),
        txt("title", r(c.x, c.y + ph + gap, c.w, c.h - ph - gap - 10 * k), { sizeMul: 0.7, valign: "top" }),
        txt("subtitle", r(c.x, c.y + c.h - 9 * k, c.w, 9 * k), {}),
      ],
    };
  },
});

def({
  key: "photo-caption",
  name: "Photo with caption",
  description: "A photo, a caption and a short description.",
  group: "photos",
  imageSlots: 1,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    if (geom.trim.w > geom.trim.h) {
      const iw = c.w * 0.62;
      return {
        slots: [
          img(r(c.x, c.y, iw, c.h), { mode: "contain" }),
          txt("heading", r(c.x + iw + gap * 2, c.y, c.w - iw - gap * 2, 30 * k), { sizeMul: 0.8 }),
          txt("body", r(c.x + iw + gap * 2, c.y + 32 * k, c.w - iw - gap * 2, c.h - 32 * k), {}),
        ],
      };
    }
    const ph = c.h * 0.66;
    return {
      slots: [
        img(r(c.x, c.y, c.w, ph), { mode: "contain" }),
        txt("heading", r(c.x, c.y + ph + gap, c.w, 14 * k), { sizeMul: 0.75 }),
        txt("body", r(c.x, c.y + ph + gap + 15 * k, c.w, c.h - ph - gap - 15 * k), {}),
      ],
    };
  },
});

def({
  key: "two-side",
  name: "Two photos side by side",
  description: "Two photos next to each other with a caption.",
  group: "photos",
  imageSlots: 2,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    const capH = 16 * k;
    const [a, b] = grid(r(c.x, c.y, c.w, c.h - capH - gap), 2, 1, gap);
    return {
      slots: [img(a, { mode: "contain" }), img(b, { mode: "contain" }), txt("caption", r(c.x, c.y + c.h - capH, c.w, capH), { align: "center", valign: "middle" })],
    };
  },
});

def({
  key: "three-editorial",
  name: "Three-photo editorial",
  description: "One lead photo over two supporting photos.",
  group: "photos",
  imageSlots: 3,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    const capH = 12 * k;
    const body = r(c.x, c.y, c.w, c.h - capH - gap);
    if (geom.trim.w > geom.trim.h) {
      const lead = body.w * 0.55;
      const [s1, s2] = grid(r(body.x + lead + gap, body.y, body.w - lead - gap, body.h), 1, 2, gap);
      return { slots: [img(r(body.x, body.y, lead, body.h), { mode: "contain" }), img(s1, { mode: "contain" }), img(s2, { mode: "contain" }), txt("caption", r(c.x, c.y + c.h - capH, c.w, capH), {})] };
    }
    const top = body.h * 0.58;
    const [s1, s2] = grid(r(body.x, body.y + top + gap, body.w, body.h - top - gap), 2, 1, gap);
    return { slots: [img(r(body.x, body.y, body.w, top), { mode: "contain" }), img(s1, { mode: "contain" }), img(s2, { mode: "contain" }), txt("caption", r(c.x, c.y + c.h - capH, c.w, capH), {})] };
  },
});

def({
  key: "four-grid",
  name: "Four-photo grid",
  description: "Four equal photos in a neat grid.",
  group: "photos",
  imageSlots: 4,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    const capH = 10 * k;
    const cells = grid(r(c.x, c.y, c.w, c.h - capH - gap), 2, 2, gap);
    return { slots: [...cells.map((f) => img(f, { mode: "contain" })), txt("caption", r(c.x, c.y + c.h - capH, c.w, capH), { align: "center", valign: "middle" })] };
  },
});

def({
  key: "six-gallery",
  name: "Six-photo gallery",
  description: "A gallery wall of six photos.",
  group: "photos",
  imageSlots: 6,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    const capH = 9 * k;
    const landscape = geom.trim.w > geom.trim.h;
    const cells = grid(r(c.x, c.y, c.w, c.h - capH - gap), landscape ? 3 : 2, landscape ? 2 : 3, gap);
    return { slots: [...cells.map((f) => img(f, { mode: "contain" })), txt("caption", r(c.x, c.y + c.h - capH, c.w, capH), { align: "center", valign: "middle" })] };
  },
});

def({
  key: "full-overlay",
  name: "Full-page photo with text",
  description: "An edge-to-edge photo with a text overlay.",
  group: "photos",
  imageSlots: 1,
  kinds: ["content", "chapter", "closing"],
  build: ({ geom, k }) => {
    const { trim, bleed, content: c } = geom;
    return {
      fullBleed: true,
      slots: [
        img(bleed, { mode: "full-page", coverPage: true, fullBleed: true }),
        shp("rect", r(trim.x, trim.h * 0.74, trim.w, trim.h * 0.26), { fill: "black", opacity: 0.45 }),
        txt("heading", r(c.x, trim.h * 0.77, c.w, 14 * k), { color: "white", sizeMul: 0.85 }),
        txt("body", r(c.x, trim.h * 0.77 + 15 * k, c.w, trim.h * 0.2 - 15 * k), { color: "white" }),
      ],
    };
  },
});

def({
  key: "image-text-column",
  name: "Photo and text column",
  description: "A photo beside a dedicated column of text.",
  group: "photos",
  imageSlots: 1,
  kinds: ["content", "intro"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    if (geom.trim.w >= geom.trim.h * 0.95) {
      const iw = c.w * 0.54;
      return {
        slots: [
          img(r(c.x, c.y, iw, c.h), { mode: "contain" }),
          txt("label", r(c.x + iw + gap * 2, c.y, c.w - iw - gap * 2, 7 * k), {}),
          txt("heading", r(c.x + iw + gap * 2, c.y + 8 * k, c.w - iw - gap * 2, 30 * k), { sizeMul: 0.9 }),
          txt("body", r(c.x + iw + gap * 2, c.y + 40 * k, c.w - iw - gap * 2, c.h - 40 * k), {}),
        ],
      };
    }
    const ph = c.h * 0.46;
    return {
      slots: [
        img(r(c.x, c.y, c.w, ph), { mode: "contain" }),
        txt("label", r(c.x, c.y + ph + gap, c.w, 7 * k), {}),
        txt("heading", r(c.x, c.y + ph + gap + 8 * k, c.w, 18 * k), { sizeMul: 0.9 }),
        txt("body", r(c.x, c.y + ph + gap + 28 * k, c.w, c.h - ph - gap - 28 * k), { columns: 2 }),
      ],
    };
  },
});

def({
  key: "hero-supporting",
  name: "Hero with supporting photos",
  description: "A large hero photo and three small ones.",
  group: "photos",
  imageSlots: 4,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    const capH = 11 * k;
    const heroH = (c.h - capH) * 0.62;
    const smallH = c.h - capH - heroH - gap * 2;
    const smalls = grid(r(c.x, c.y + heroH + gap, c.w, smallH), 3, 1, gap);
    return {
      slots: [img(r(c.x, c.y, c.w, heroH), { mode: "contain" }), ...smalls.map((f) => img(f, { mode: "contain" })), txt("caption", r(c.x, c.y + c.h - capH, c.w, capH), { align: "center", valign: "middle" })],
    };
  },
});

def({
  key: "minimal-white",
  name: "Minimal with whitespace",
  description: "One photo, generous white space and a tiny caption.",
  group: "photos",
  imageSlots: 1,
  kinds: ["content"],
  build: ({ geom, k }) => {
    const c = geom.content;
    const w = c.w * 0.7;
    const h = c.h * 0.6;
    return {
      slots: [
        img(r(geom.trim.w / 2 - w / 2, c.y + c.h * 0.12, w, h), { mode: "contain" }),
        txt("caption", r(geom.trim.w / 2 - w / 2, c.y + c.h * 0.12 + h + 6 * k, w, 14 * k), { align: "center" }),
      ],
    };
  },
});

def({
  key: "photo-only",
  name: "Single photo",
  description: "One whole photo as large as the page allows. Ideal for prints.",
  group: "photos",
  imageSlots: 1,
  kinds: ["content", "blank"],
  build: ({ geom }) => ({ slots: [img(geom.content, { mode: "contain" })] }),
});

// -- text and magazine pages -----------------------------------------------------

def({
  key: "article",
  name: "Magazine article",
  description: "Headline, standfirst, photo and two columns of text.",
  group: "text",
  imageSlots: 1,
  kinds: ["content", "intro"],
  build: ({ geom, k }) => {
    const c = geom.content;
    const headH = 26 * k;
    const ph = c.h * 0.32;
    const top = c.y + 8 * k;
    return {
      slots: [
        txt("label", r(c.x, c.y, c.w, 6 * k), {}),
        txt("title", r(c.x, top, c.w, headH), { sizeMul: 0.8 }),
        txt("subtitle", r(c.x, top + headH, c.w, 14 * k), { sizeMul: 0.9 }),
        img(r(c.x, top + headH + 16 * k, c.w, ph), { mode: "contain" }),
        txt("caption", r(c.x, top + headH + 16 * k + ph + 1, c.w, 8 * k), {}),
        txt("body", r(c.x, top + headH + 16 * k + ph + 10 * k, c.w, c.h - (headH + 16 * k + ph + 18 * k)), { columns: 2 }),
      ],
    };
  },
});

def({
  key: "text-page",
  name: "Text page",
  description: "A heading and flowing text. For introductions and stories.",
  group: "text",
  imageSlots: 0,
  kinds: ["intro", "content", "closing"],
  build: ({ geom, k }) => {
    const c = geom.content;
    return {
      slots: [
        txt("label", r(c.x, c.y, c.w, 6 * k), {}),
        txt("heading", r(c.x, c.y + 8 * k, c.w, 20 * k), {}),
        txt("body", r(c.x, c.y + 32 * k, Math.min(c.w, 135 * k), c.h - 32 * k), { sizeMul: 1.15 }),
      ],
    };
  },
});

def({
  key: "itinerary",
  name: "Travel itinerary",
  description: "Day by day plan with a strip of photos.",
  group: "text",
  imageSlots: 2,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    const stripH = c.h * 0.26;
    const [a, b] = grid(r(c.x, c.y, c.w, stripH), 2, 1, gap);
    return {
      slots: [
        img(a, { mode: "contain" }),
        img(b, { mode: "contain" }),
        txt("label", r(c.x, c.y + stripH + gap * 2, c.w, 6 * k), {}),
        txt("heading", r(c.x, c.y + stripH + gap * 2 + 8 * k, c.w, 18 * k), { sizeMul: 0.9 }),
        shp("line", r(c.x, c.y + stripH + gap * 2 + 28 * k, c.w, 1), { stroke: "muted", strokeMm: 0.2, opacity: 0.5 }),
        txt("body", r(c.x, c.y + stripH + gap * 2 + 31 * k, c.w, c.h - stripH - gap * 2 - 31 * k), {}),
      ],
    };
  },
});

def({
  key: "destination-info",
  name: "Destination information",
  description: "Facts about the place: season, elevation and what it is known for.",
  group: "text",
  imageSlots: 1,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    const ph = c.h * 0.36;
    const colW = (c.w - gap) / 2;
    const top = c.y + ph + gap * 2;
    return {
      slots: [
        img(r(c.x, c.y, c.w, ph), { mode: "contain" }),
        txt("label", r(c.x, top, c.w, 6 * k), {}),
        txt("heading", r(c.x, top + 8 * k, c.w, 20 * k), {}),
        txt("subtitle", r(c.x, top + 29 * k, c.w, 16 * k), { sizeMul: 0.85 }),
        shp("line", r(c.x, top + 46 * k, c.w, 1), { stroke: "muted", strokeMm: 0.2, opacity: 0.5 }),
        txt("meta", r(c.x, top + 50 * k, colW, 6 * k), {}),
        txt("body", r(c.x, top + 57 * k, colW, c.h - (top - c.y) - 57 * k), {}),
        txt("meta", r(c.x + colW + gap, top + 50 * k, colW, 6 * k), {}),
        txt("body", r(c.x + colW + gap, top + 57 * k, colW, c.h - (top - c.y) - 57 * k), {}),
      ],
    };
  },
});

def({
  key: "locations",
  name: "Places we went",
  description: "A list of locations with a supporting photo.",
  group: "text",
  imageSlots: 1,
  kinds: ["content"],
  build: ({ geom, gap, k }) => {
    const c = geom.content;
    const landscape = geom.trim.w > geom.trim.h;
    const iw = landscape ? c.w * 0.4 : c.w;
    const ih = landscape ? c.h : c.h * 0.4;
    const tx = landscape ? c.x + iw + gap * 2 : c.x;
    const ty = landscape ? c.y : c.y + ih + gap * 2;
    const tw = landscape ? c.w - iw - gap * 2 : c.w;
    const th = landscape ? c.h : c.h - ih - gap * 2;
    return {
      slots: [
        img(r(c.x, c.y, iw, ih), { mode: "contain" }),
        txt("label", r(tx, ty, tw, 6 * k), {}),
        txt("heading", r(tx, ty + 8 * k, tw, 20 * k), {}),
        txt("body", r(tx, ty + 30 * k, tw, th - 30 * k), { sizeMul: 1.05 }),
      ],
    };
  },
});

def({
  key: "timeline",
  name: "Memory timeline",
  description: "Moments in order, along a vertical line.",
  group: "text",
  imageSlots: 1,
  kinds: ["content"],
  build: ({ geom, k }) => {
    const c = geom.content;
    const lineX = c.x + 4 * k;
    return {
      slots: [
        txt("label", r(c.x, c.y, c.w, 6 * k), {}),
        txt("heading", r(c.x, c.y + 8 * k, c.w, 20 * k), {}),
        shp("rect", r(lineX - 0.2, c.y + 36 * k, 0.4, c.h - 36 * k - c.h * 0.3), { fill: "accent", opacity: 0.8 }),
        txt("body", r(c.x + 12 * k, c.y + 34 * k, c.w - 12 * k, c.h - 34 * k - c.h * 0.3), { sizeMul: 1.05 }),
        img(r(c.x, c.y + c.h * 0.72, c.w, c.h * 0.28), { mode: "contain" }),
      ],
    };
  },
});

def({
  key: "quote",
  name: "Quote page",
  description: "A single memory or quote, set large.",
  group: "special",
  imageSlots: 0,
  kinds: ["quote", "content"],
  build: ({ geom, k }) => {
    const { trim, content: c } = geom;
    return {
      slots: [
        txt("label", r(c.x, trim.h * 0.3, c.w, 6 * k), { align: "center" }),
        txt("quote", r(c.x + c.w * 0.06, trim.h * 0.36, c.w * 0.88, trim.h * 0.28), { valign: "middle" }),
        shp("line", r(trim.w / 2 - 10 * k, trim.h * 0.68, 20 * k, 1), { stroke: "accent", strokeMm: 0.4 }),
        txt("meta", r(c.x, trim.h * 0.7, c.w, 8 * k), { align: "center" }),
      ],
    };
  },
});

def({
  key: "chapter",
  name: "Chapter divider",
  description: "A bold page that opens a new chapter.",
  group: "special",
  imageSlots: 0,
  kinds: ["chapter"],
  build: ({ geom, k }) => {
    const { trim, content: c } = geom;
    return {
      background: "accent",
      slots: [
        txt("label", r(c.x, trim.h * 0.36, c.w, 8 * k), { color: "paper", align: "center" }),
        txt("title", r(c.x, trim.h * 0.4, c.w, trim.h * 0.2), { color: "paper", align: "center", valign: "middle", sizeMul: 1.15 }),
        shp("line", r(trim.w / 2 - 12 * k, trim.h * 0.63, 24 * k, 1), { stroke: "paper", strokeMm: 0.4 }),
        txt("subtitle", r(c.x, trim.h * 0.66, c.w, 20 * k), { color: "paper", align: "center" }),
      ],
    };
  },
});

def({
  key: "contents",
  name: "Contents",
  description: "A list of what is in the book, filled in for you.",
  group: "special",
  imageSlots: 0,
  kinds: ["contents"],
  build: ({ geom, k }) => {
    const c = geom.content;
    return {
      slots: [
        txt("label", r(c.x, c.y + 6 * k, c.w, 6 * k), {}),
        txt("heading", r(c.x, c.y + 14 * k, c.w, 20 * k), { sizeMul: 1.2 }),
        shp("line", r(c.x, c.y + 38 * k, c.w, 1), { stroke: "muted", strokeMm: 0.2, opacity: 0.5 }),
        txt("body", r(c.x, c.y + 44 * k, c.w, c.h - 44 * k), { sizeMul: 1.1 }),
      ],
    };
  },
});

def({
  key: "back-cover",
  name: "Back cover",
  description: "A closing message on the back.",
  group: "cover",
  imageSlots: 0,
  kinds: ["back"],
  build: ({ geom, k }) => {
    const { trim, content: c } = geom;
    return {
      background: "ink",
      fullBleed: true,
      slots: [
        txt("quote", r(c.x + c.w * 0.08, trim.h * 0.32, c.w * 0.84, trim.h * 0.26), { color: "paper", valign: "middle", sizeMul: 0.8 }),
        shp("line", r(trim.w / 2 - 10 * k, trim.h * 0.62, 20 * k, 1), { stroke: "accent", strokeMm: 0.4 }),
        txt("meta", r(c.x, trim.h * 0.65, c.w, 10 * k), { color: "paper", align: "center" }),
        txt("meta", r(c.x, trim.h * 0.9 - 4, c.w, 6 * k), { color: "muted", align: "center" }),
      ],
    };
  },
});

def({
  key: "blank",
  name: "Blank page",
  description: "An empty page.",
  group: "special",
  imageSlots: 0,
  kinds: ["blank", "content"],
  build: () => ({ slots: [] }),
});

export const LAYOUTS: readonly LayoutDef[] = L;
const byKey = new Map(L.map((l) => [l.key, l]));
export const getLayout = (key: string | null | undefined): LayoutDef | undefined => (key ? byKey.get(key) : undefined);

// -- applying a layout ---------------------------------------------------------------

const COMPATIBLE: Record<TextRole, TextRole[]> = {
  title: ["heading", "subtitle"],
  heading: ["title", "subtitle"],
  subtitle: ["caption", "body", "heading"],
  caption: ["body", "subtitle"],
  body: ["caption", "subtitle", "quote"],
  quote: ["body", "caption"],
  label: ["meta"],
  meta: ["label", "caption"],
  folio: [],
  custom: ["body", "caption"],
};

function textFromSlot(slot: TextSlot, ctx: LayoutCtx, content: string, keep?: TextElement): TextElement {
  const { theme, k, kb } = ctx;
  const style = roleStyle(slot.role, theme, k, kb);
  if (slot.font) style.font = slot.font === "heading" ? theme.headingFont : slot.font === "script" ? theme.scriptFont : slot.font === "label" ? theme.labelFont : theme.bodyFont;
  if (slot.sizeMul) style.sizePt *= slot.sizeMul;
  if (slot.color) style.color = resolveColor(slot.color, theme);
  if (slot.align) style.align = slot.align;
  if (slot.uppercase !== undefined) style.uppercase = slot.uppercase;
  if (slot.italic !== undefined) style.italic = slot.italic;
  if (slot.tracking !== undefined) style.trackingPt = slot.tracking;
  const el = makeText(slot.role, slot.frame, content, style, {
    columns: slot.columns ?? 1,
    valign: slot.valign ?? "top",
    paddingMm: slot.paddingMm ?? 0,
    field: slot.field ?? "none",
    background: slot.background ? resolveColor(slot.background, theme) : undefined,
  });
  if (keep) el.id = keep.id;
  return el;
}

function imageFromSlot(slot: ImageSlot, ctx: LayoutCtx, keep?: ImageElement, sizes?: ReadonlyMap<string, SourceSize>): ImageElement {
  const base = makeImage(slot.frame, keep?.sourceId ?? null, {
    slot: { ...slot.frame },
    mode: slot.mode ?? "contain",
    coverPage: slot.coverPage ?? false,
    fullBleed: slot.fullBleed ?? false,
    radiusMm: slot.radiusMm ?? 0,
    shadow: slot.shadow ?? false,
    borderMm: slot.borderMm ?? 0,
    borderColor: slot.borderColor ? resolveColor(slot.borderColor, ctx.theme) : "#ffffff",
    background: slot.background ? resolveColor(slot.background, ctx.theme) : undefined,
  });
  // A whole-photo frame fits the picture itself, so borders, shadows and the selection box match what you see.
  const size = base.sourceId ? sizes?.get(base.sourceId) : undefined;
  if (size && base.mode === "contain") base.frame = containRect(slot.frame, size.width / size.height);
  if (keep) {
    // The photo, its description and its colour treatment travel with it; geometry comes from the layout.
    base.id = keep.id;
    base.alt = keep.alt;
    base.filter = keep.filter;
    base.opacity = keep.opacity;
  }
  return base;
}

export interface ApplyResult {
  page: BookPage;
  /** Items that did not fit the new layout and are waiting in `page.unplaced` */
  unplacedImages: number;
  unplacedTexts: number;
  /** Frames that have no photo yet */
  emptyImageSlots: number;
}

/**
 * Re-flows a page into a layout without losing anything: photos and text are carried over
 * to matching slots, and anything that has no slot is kept aside as "unplaced" so the user can decide.
 */
export function applyLayout(page: BookPage, layoutKey: string, theme: BookTheme, settings: BookSettings, sizes?: ReadonlyMap<string, SourceSize>): ApplyResult {
  const layout = getLayout(layoutKey);
  if (!layout) return { page, unplacedImages: 0, unplacedTexts: 0, emptyImageSlots: 0 };
  const ctx = layoutCtx(theme, settings);
  const built = layout.build(ctx);

  const oldImages = [...page.elements.filter((e): e is ImageElement => e.type === "image"), ...page.unplaced.filter((e): e is ImageElement => e.type === "image")];
  const oldTexts = [...page.elements.filter((e): e is TextElement => e.type === "text" && e.field === "none"), ...page.unplaced.filter((e): e is TextElement => e.type === "text")];
  const folios = page.elements.filter((e): e is TextElement => e.type === "text" && e.field !== "none");
  const userShapes = page.elements.filter((e) => e.type === "shape" && !e.id.startsWith("ls_"));

  const usedTexts = new Set<string>();
  const takeText = (role: TextRole): TextElement | undefined => {
    const order = [role, ...COMPATIBLE[role]];
    for (const want of order) {
      const found = oldTexts.find((t) => !usedTexts.has(t.id) && t.role === want && t.text.trim() !== "");
      if (found) {
        usedTexts.add(found.id);
        return found;
      }
    }
    return undefined;
  };

  let imageIndex = 0;
  let empty = 0;
  const elements: BookElement[] = [];
  for (const slot of built.slots) {
    if (slot.kind === "image") {
      const keep = oldImages[imageIndex++];
      if (!keep || !keep.sourceId) empty += 1;
      elements.push(imageFromSlot(slot, ctx, keep, sizes));
    } else if (slot.kind === "text") {
      const keep = takeText(slot.role);
      elements.push(textFromSlot(slot, ctx, keep?.text ?? "", keep));
    } else {
      const el = makeShape(slot.shape, slot.frame, {
        fill: slot.fill ? resolveColor(slot.fill, theme) : null,
        stroke: slot.stroke ? resolveColor(slot.stroke, theme) : null,
        strokeMm: slot.strokeMm ?? 0.3,
        opacity: slot.opacity ?? 1,
      });
      el.id = el.id.replace(/^s_/, "ls_");
      elements.push(el);
    }
  }

  const unusedImages = oldImages.slice(imageIndex).filter((i) => i.sourceId);
  const unusedTexts = oldTexts.filter((t) => !usedTexts.has(t.id) && t.text.trim() !== "");
  const background = { ...page.background };
  background.color = built.background ? resolveColor(built.background, theme) : theme.paper;
  // A photo background belongs to the page, not the layout, so it is kept.
  const next: BookPage = {
    ...page,
    layoutKey,
    elements: [...elements, ...userShapes, ...folios],
    unplaced: [...unusedImages, ...unusedTexts],
    background,
    fullBleed: built.fullBleed ?? false,
  };
  return { page: next, unplacedImages: unusedImages.length, unplacedTexts: unusedTexts.length, emptyImageSlots: empty };
}

export const GROUP_LABELS: Record<LayoutGroup, string> = {
  cover: "Covers",
  photos: "Photo pages",
  text: "Text and editorial",
  special: "Special pages",
};
