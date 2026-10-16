import { isNeutral } from "./filters";
import type { ResolvedFont } from "./fonts";
import { placeImage, type ImagePlacement, type SourceSize } from "./image-fit";
import { layoutText, type LayoutContext, type TextLayout } from "./text-layout";
import type { BookElement, BookPage, BookProject, ImageElement, ImageFilter, ShapeElement, TextElement } from "./types";
import { pageGeometry, type PageGeometry, type Rect } from "./units";

/**
 * Everything on a page as plain drawing instructions in millimetres. The editor draws this as SVG
 * and the exporter writes it to the PDF, so they are the same page by construction.
 */
export type DisplayItem =
  | { type: "rect"; rect: Rect; fill: string | null; stroke: string | null; strokeMm: number; radiusMm: number; opacity: number }
  | { type: "ellipse"; rect: Rect; fill: string | null; stroke: string | null; strokeMm: number; opacity: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeMm: number; opacity: number }
  | {
      type: "image";
      sourceId: string;
      dest: Rect;
      clip: Rect;
      radiusMm: number;
      opacity: number;
      filter: ImageFilter;
      elementId: string;
    }
  | {
      type: "text";
      font: ResolvedFont;
      sizePt: number;
      trackingPt: number;
      color: string;
      opacity: number;
      /** Baseline in mm */
      y: number;
      segments: { text: string; x: number }[];
      uppercase: boolean;
    };

export interface PageRender {
  geometry: PageGeometry;
  items: DisplayItem[];
  placements: Map<string, ImagePlacement>;
  layouts: Map<string, TextLayout>;
  /** Ids of images whose source is missing */
  missingSources: string[];
}

export interface RenderContext extends LayoutContext {
  /** Pixel size of every known source photo */
  sources: ReadonlyMap<string, SourceSize>;
  pageNumber?: number;
}

export function projectGeometry(project: Pick<BookProject, "settings">): PageGeometry {
  const s = project.settings;
  return pageGeometry({ widthMm: s.widthMm, heightMm: s.heightMm }, s.bleedMm, s.marginMm, s.safeMm);
}

function patternItems(page: BookPage, geom: PageGeometry, color: string): DisplayItem[] {
  const t = geom.trim;
  const items: DisplayItem[] = [];
  switch (page.background.pattern) {
    case "frame":
      items.push({ type: "rect", rect: { x: t.x + 8, y: t.y + 8, w: t.w - 16, h: t.h - 16 }, fill: null, stroke: color, strokeMm: 0.3, radiusMm: 0, opacity: 0.55 });
      break;
    case "lines":
      for (let y = 20; y < t.h - 12; y += 8) items.push({ type: "line", x1: 14, y1: y, x2: t.w - 14, y2: y, stroke: color, strokeMm: 0.15, opacity: 0.35 });
      break;
    case "dots":
      for (let y = 12; y < t.h - 8; y += 10) for (let x = 12; x < t.w - 8; x += 10) items.push({ type: "ellipse", rect: { x: x - 0.35, y: y - 0.35, w: 0.7, h: 0.7 }, fill: color, stroke: null, strokeMm: 0, opacity: 0.3 });
      break;
  }
  return items;
}

const SHADOW_LAYERS = [
  { grow: 0.6, dy: 1.1, opacity: 0.07 },
  { grow: 1.4, dy: 1.7, opacity: 0.05 },
  { grow: 2.4, dy: 2.4, opacity: 0.03 },
];

function imageItems(el: ImageElement, page: BookPage, geom: PageGeometry, ctx: RenderContext, placements: Map<string, ImagePlacement>, missing: string[]): DisplayItem[] {
  if (!el.sourceId) return [];
  const src = ctx.sources.get(el.sourceId);
  if (!src || !(src.width > 0 && src.height > 0)) {
    missing.push(el.id);
    return [];
  }
  const p = placeImage(el, src, geom, page.fullBleed);
  placements.set(el.id, p);
  const items: DisplayItem[] = [];
  const radius = Math.min(el.radiusMm, p.clip.w / 2, p.clip.h / 2);
  if (el.background) items.push({ type: "rect", rect: p.frame, fill: el.background, stroke: null, strokeMm: 0, radiusMm: radius, opacity: 1 });
  if (el.shadow && p.clip.w > 0) {
    for (const l of SHADOW_LAYERS) {
      items.push({
        type: "rect",
        rect: { x: p.clip.x - l.grow, y: p.clip.y - l.grow + l.dy, w: p.clip.w + 2 * l.grow, h: p.clip.h + 2 * l.grow },
        fill: "#000000",
        stroke: null,
        strokeMm: 0,
        radiusMm: radius + l.grow,
        opacity: l.opacity * el.opacity,
      });
    }
  }
  if (p.clip.w > 0 && p.clip.h > 0) {
    items.push({
      type: "image",
      sourceId: el.sourceId,
      dest: p.dest,
      clip: p.clip,
      radiusMm: radius,
      opacity: el.opacity,
      filter: isNeutral(el.filter) ? el.filter : el.filter,
      elementId: el.id,
    });
    if (el.borderMm > 0) {
      const b = el.borderMm;
      items.push({
        type: "rect",
        rect: { x: p.clip.x + b / 2, y: p.clip.y + b / 2, w: Math.max(0.1, p.clip.w - b), h: Math.max(0.1, p.clip.h - b) },
        fill: null,
        stroke: el.borderColor,
        strokeMm: b,
        radiusMm: Math.max(0, radius - b / 2),
        opacity: el.opacity,
      });
    }
  }
  return items;
}

function textItems(el: TextElement, ctx: RenderContext, layouts: Map<string, TextLayout>): DisplayItem[] {
  const items: DisplayItem[] = [];
  if (el.background) items.push({ type: "rect", rect: el.frame, fill: el.background, stroke: null, strokeMm: 0, radiusMm: 0, opacity: el.opacity });
  const layout = layoutText(el, ctx);
  layouts.set(el.id, layout);
  for (const line of layout.lines) {
    items.push({
      type: "text",
      font: layout.font,
      sizePt: el.style.sizePt,
      trackingPt: el.style.trackingPt,
      color: el.style.color,
      opacity: el.opacity,
      y: line.y,
      segments: line.segments,
      uppercase: false,
    });
  }
  return items;
}

function shapeItems(el: ShapeElement): DisplayItem[] {
  const f = el.frame;
  if (el.shape === "line") {
    return [{ type: "line", x1: f.x, y1: f.y + f.h / 2, x2: f.x + f.w, y2: f.y + f.h / 2, stroke: el.stroke ?? el.fill ?? "#000000", strokeMm: Math.max(0.1, el.strokeMm), opacity: el.opacity }];
  }
  if (el.shape === "ellipse") return [{ type: "ellipse", rect: f, fill: el.fill, stroke: el.stroke, strokeMm: el.strokeMm, opacity: el.opacity }];
  return [{ type: "rect", rect: f, fill: el.fill, stroke: el.stroke, strokeMm: el.strokeMm, radiusMm: el.radiusMm, opacity: el.opacity }];
}

export function elementItems(el: BookElement, page: BookPage, geom: PageGeometry, ctx: RenderContext, placements: Map<string, ImagePlacement>, layouts: Map<string, TextLayout>, missing: string[]): DisplayItem[] {
  if (el.type === "image") return imageItems(el, page, geom, ctx, placements, missing);
  if (el.type === "text") return textItems(el, ctx, layouts);
  return shapeItems(el);
}

export function renderPage(project: BookProject, page: BookPage, ctx: RenderContext): PageRender {
  const geom = projectGeometry(project);
  const items: DisplayItem[] = [];
  const placements = new Map<string, ImagePlacement>();
  const layouts = new Map<string, TextLayout>();
  const missing: string[] = [];

  // Background colour reaches the bleed edge so there is never a white sliver after trimming.
  items.push({ type: "rect", rect: geom.bleed, fill: page.background.color, stroke: null, strokeMm: 0, radiusMm: 0, opacity: 1 });
  if (page.background.imageId) {
    const src = ctx.sources.get(page.background.imageId);
    if (src) {
      const bgEl: ImageElement = {
        id: "bg",
        type: "image",
        sourceId: page.background.imageId,
        frame: geom.bleed,
        mode: "full-page",
        focusX: 0.5,
        focusY: 0.5,
        zoom: 1,
        crop: null,
        coverPage: true,
        fullBleed: true,
        borderMm: 0,
        borderColor: "#000000",
        radiusMm: 0,
        shadow: false,
        opacity: 1,
        filter: { preset: "none", brightness: 0, contrast: 0, saturation: 0 },
        alt: "",
      };
      items.push(...imageItems(bgEl, { ...page, fullBleed: true }, geom, ctx, placements, missing));
    }
  }
  items.push(...patternItems(page, geom, project.theme.muted));
  const pageCtx = { ...ctx };
  for (const el of page.elements) items.push(...elementItems(el, page, geom, pageCtx, placements, layouts, missing));
  return { geometry: geom, items, placements, layouts, missingSources: missing };
}
