import {
  appendBezierCurve,
  clip,
  closePath,
  degrees,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  PDFDocument,
  pushGraphicsState,
  rectangle,
  rgb,
  setCharacterSpacing,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { renderPage, type DisplayItem, type PageRender } from "./display-list";
import { isNeutral } from "./filters";
import { resolveFont, type FontStore, type ResolvedFont } from "./fonts";
import { TARGET_DPI } from "./lint";
import type { BookPage, BookProject, ImageFilter } from "./types";
import { mmToPt, mmToPx, type Rect } from "./units";

export type ExportScope = "all" | "page" | "spreads" | "cover-wrap";
export type ExportQuality = "print" | "share";

export interface PdfOptions {
  scope: ExportScope;
  quality: ExportQuality;
  /** For scope "page": which page (0-based) */
  pageIndex?: number;
  /** Extend the page to the bleed edge in the PDF (what most printers want) */
  includeBleed: boolean;
  cropMarks: boolean;
  /** Carry on without a photo that cannot be loaded, instead of stopping */
  skipBrokenImages?: boolean;
}

export interface PdfImageProvider {
  size(sourceId: string): { width: number; height: number } | undefined;
  /** Returns the photo prepared for the PDF: filtered, and scaled down only when it is larger than needed. */
  render(
    sourceId: string,
    opts: { maxWidthPx: number; filter: ImageFilter; quality: number },
  ): Promise<{ bytes: Uint8Array; format: "jpg" | "png"; width: number; height: number }>;
  name?(sourceId: string): string;
}

export interface PdfProgress {
  stage: "preparing" | "pages" | "saving";
  /** 0-1 */
  fraction: number;
  message: string;
}

export interface PdfResult {
  bytes: Uint8Array;
  pageCount: number;
  /** Physical size of each PDF page in mm (media box) */
  sizes: { widthMm: number; heightMm: number }[];
  warnings: string[];
}

export class PdfCancelled extends Error {
  constructor() {
    super("Export cancelled.");
    this.name = "PdfCancelled";
  }
}

export class PdfExportError extends Error {
  constructor(
    message: string,
    readonly recoverable = false,
  ) {
    super(message);
    this.name = "PdfExportError";
  }
}

interface SheetPart {
  render: PageRender;
  /** Offset of this page's trim origin from the sheet's trim origin, in mm */
  dx: number;
  /** How far past the trim edge this part may draw, per side (mm) */
  bleed: { l: number; r: number; t: number; b: number };
}

interface Sheet {
  /** Size of the trimmed sheet in mm */
  trimW: number;
  trimH: number;
  parts: SheetPart[];
  /** Fill between parts, for a spine */
  spine?: { x: number; w: number; color: string; textColor: string; title: string; font: ResolvedFont };
  bleed: number;
}

const MARK_AREA = 9;

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim()) ?? /^#?([0-9a-f]{3})$/i.exec(hex.trim());
  let v = m?.[1] ?? "000000";
  if (v.length === 3) v = [...v].map((c) => c + c).join("");
  const n = parseInt(v, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function luminance(hex: string): number {
  const c = hexToRgb(hex);
  return 0.2126 * c.red + 0.7152 * c.green + 0.0722 * c.blue;
}

/** Spread order for a book with a front and back cover: cover alone on the right, then pairs, back alone on the left. */
export function spreadGroups(pageCount: number): number[][] {
  const groups: number[][] = [];
  if (pageCount === 0) return groups;
  groups.push([0]);
  let i = 1;
  while (i < pageCount - 1) {
    groups.push(i + 1 < pageCount - 1 ? [i, i + 1] : [i]);
    i += 2;
  }
  if (pageCount > 1) groups.push([pageCount - 1]);
  return groups;
}

export function spineWidthMm(project: Pick<BookProject, "pages" | "settings">): number {
  return Math.max(2, Math.round(project.pages.length * project.settings.paperMm * 10) / 10);
}

class Writer {
  private fonts = new Map<string, PDFFont>();
  private images = new Map<string, PDFImage>();
  fallback: PDFFont | null = null;
  warnings: string[] = [];

  constructor(
    private doc: PDFDocument,
    private store: FontStore,
  ) {}

  async font(resolved: ResolvedFont): Promise<PDFFont> {
    const cached = this.fonts.get(resolved.file);
    if (cached) return cached;
    const loaded = await this.store.load(resolved);
    let font: PDFFont;
    if (loaded) {
      font = await this.doc.embedFont(loaded.bytes, { subset: true });
    } else {
      this.fallback ??= await this.doc.embedFont(StandardFonts.Helvetica);
      this.warnings.push(`The font ${resolved.family} couldn't be loaded, so a standard font was used for some text.`);
      font = this.fallback;
    }
    this.fonts.set(resolved.file, font);
    return font;
  }

  async image(key: string, make: () => Promise<{ bytes: Uint8Array; format: "jpg" | "png" }>): Promise<PDFImage> {
    const cached = this.images.get(key);
    if (cached) return cached;
    const { bytes, format } = await make();
    const embedded = format === "png" ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes);
    this.images.set(key, embedded);
    return embedded;
  }
}

/** Path for a rounded rectangle in PDF points (y up), built from operators so it can also be used as a clip. */
function roundedPath(x: number, y: number, w: number, h: number, r: number) {
  const k = 0.5522847498 * r;
  const x2 = x + w;
  const y2 = y + h;
  return [
    moveTo(x + r, y),
    lineTo(x2 - r, y),
    appendBezierCurve(x2 - r + k, y, x2, y + r - k, x2, y + r),
    lineTo(x2, y2 - r),
    appendBezierCurve(x2, y2 - r + k, x2 - r + k, y2, x2 - r, y2),
    lineTo(x + r, y2),
    appendBezierCurve(x + r - k, y2, x, y2 - r + k, x, y2 - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - k, x + r - k, y, x + r, y),
    closePath(),
  ];
}

function pathFor(x: number, y: number, w: number, h: number, r: number) {
  return r > 0.01 ? roundedPath(x, y, w, h, Math.min(r, w / 2, h / 2)) : [rectangle(x, y, w, h)];
}

async function drawItems(
  page: PDFPage,
  writer: Writer,
  items: DisplayItem[],
  toPt: { x: (mm: number) => number; y: (mm: number) => number },
  provider: PdfImageProvider,
  opts: PdfOptions,
  dpi: number,
  quality: number,
  signal?: AbortSignal,
): Promise<void> {
  const X = toPt.x;
  const Y = toPt.y;
  for (const item of items) {
    if (signal?.aborted) throw new PdfCancelled();
    switch (item.type) {
      case "rect": {
        const x = X(item.rect.x);
        const y = Y(item.rect.y + item.rect.h);
        const w = mmToPt(item.rect.w);
        const h = mmToPt(item.rect.h);
        if (item.radiusMm > 0.01) {
          page.pushOperators(pushGraphicsState(), ...roundedPath(x, y, w, h, mmToPt(item.radiusMm)));
          page.pushOperators(popGraphicsState());
          // Rounded shapes are drawn as an SVG path so fill and stroke both work.
          const r = Math.min(mmToPt(item.radiusMm), w / 2, h / 2);
          const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
          page.drawSvgPath(d, {
            x,
            y: y + h,
            color: item.fill ? hexToRgb(item.fill) : undefined,
            opacity: item.fill ? item.opacity : undefined,
            borderColor: item.stroke ? hexToRgb(item.stroke) : undefined,
            borderWidth: item.stroke ? mmToPt(item.strokeMm) : 0,
            borderOpacity: item.opacity,
          });
        } else {
          page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            color: item.fill ? hexToRgb(item.fill) : undefined,
            opacity: item.fill ? item.opacity : undefined,
            borderColor: item.stroke ? hexToRgb(item.stroke) : undefined,
            borderWidth: item.stroke ? mmToPt(item.strokeMm) : 0,
            borderOpacity: item.opacity,
          });
        }
        break;
      }
      case "ellipse":
        page.drawEllipse({
          x: X(item.rect.x + item.rect.w / 2),
          y: Y(item.rect.y + item.rect.h / 2),
          xScale: mmToPt(item.rect.w / 2),
          yScale: mmToPt(item.rect.h / 2),
          color: item.fill ? hexToRgb(item.fill) : undefined,
          opacity: item.fill ? item.opacity : undefined,
          borderColor: item.stroke ? hexToRgb(item.stroke) : undefined,
          borderWidth: item.stroke ? mmToPt(item.strokeMm) : 0,
          borderOpacity: item.opacity,
        });
        break;
      case "line":
        page.drawLine({
          start: { x: X(item.x1), y: Y(item.y1) },
          end: { x: X(item.x2), y: Y(item.y2) },
          thickness: mmToPt(item.strokeMm),
          color: hexToRgb(item.stroke),
          opacity: item.opacity,
        });
        break;
      case "text": {
        const font = await writer.font(item.font);
        page.pushOperators(pushGraphicsState());
        if (item.trackingPt) page.pushOperators(setCharacterSpacing(item.trackingPt));
        for (const seg of item.segments) {
          if (!seg.text) continue;
          page.drawText(seg.text, { x: X(seg.x), y: Y(item.y), size: item.sizePt, font, color: hexToRgb(item.color), opacity: item.opacity });
        }
        page.pushOperators(popGraphicsState());
        break;
      }
      case "image": {
        const src = provider.size(item.sourceId);
        if (!src) break;
        const maxWidthPx = Math.ceil(mmToPx(item.dest.w, dpi));
        const bucket = Math.min(src.width, Math.max(64, Math.round(maxWidthPx / 16) * 16));
        const fkey = isNeutral(item.filter) ? "n" : `${item.filter.preset}${item.filter.brightness}${item.filter.contrast}${item.filter.saturation}`;
        let embedded: PDFImage;
        try {
          embedded = await writer.image(`${item.sourceId}|${bucket}|${fkey}`, () => provider.render(item.sourceId, { maxWidthPx: bucket, filter: item.filter, quality }));
        } catch (e) {
          const name = provider.name?.(item.sourceId) ?? "A photo";
          if (opts.skipBrokenImages) {
            writer.warnings.push(`${name} couldn't be loaded and was left out.`);
            break;
          }
          throw new PdfExportError(`${name} couldn't be loaded: ${e instanceof Error ? e.message : "unknown error"}. It may be blocked by the image's server or damaged.`, true);
        }
        const cx = X(item.clip.x);
        const cy = Y(item.clip.y + item.clip.h);
        page.pushOperators(pushGraphicsState(), ...pathFor(cx, cy, mmToPt(item.clip.w), mmToPt(item.clip.h), mmToPt(item.radiusMm)), clip(), endPath());
        page.drawImage(embedded, {
          x: X(item.dest.x),
          y: Y(item.dest.y + item.dest.h),
          width: mmToPt(item.dest.w),
          height: mmToPt(item.dest.h),
          opacity: item.opacity,
        });
        page.pushOperators(popGraphicsState());
        break;
      }
    }
  }
}

function drawCropMarks(page: PDFPage, trim: Rect, bleed: number) {
  // Marks sit outside the bleed area so they never print on the page.
  const gap = bleed + 1.5;
  const len = 5;
  const t = 0.25;
  const color = rgb(0, 0, 0);
  const corners: [number, number, number, number][] = [
    [trim.x, trim.y, -1, -1],
    [trim.x + trim.w, trim.y, 1, -1],
    [trim.x, trim.y + trim.h, -1, 1],
    [trim.x + trim.w, trim.y + trim.h, 1, 1],
  ];
  for (const [x, y, sx, sy] of corners) {
    page.drawLine({ start: { x: x + sx * gap, y: y }, end: { x: x + sx * (gap + len), y: y }, thickness: t, color });
    page.drawLine({ start: { x: x, y: y + sy * gap }, end: { x: x, y: y + sy * (gap + len) }, thickness: t, color });
  }
}

/** Plans which pages go on which PDF page. */
function planSheets(project: BookProject, renders: PageRender[], opts: PdfOptions): Sheet[] {
  const { settings } = project;
  const W = settings.widthMm;
  const H = settings.heightMm;
  const b = opts.includeBleed ? settings.bleedMm : 0;
  const all = { l: b, r: b, t: b, b };
  if (opts.scope === "page" || opts.scope === "all") {
    const indexes = opts.scope === "page" ? [Math.max(0, Math.min(project.pages.length - 1, opts.pageIndex ?? 0))] : project.pages.map((_, i) => i);
    return indexes.map((i) => ({ trimW: W, trimH: H, parts: [{ render: renders[i], dx: 0, bleed: all }], bleed: b }));
  }
  if (opts.scope === "spreads") {
    return spreadGroups(project.pages.length).map((group) => {
      const hasLeft = group.length === 2 || (group[0] === project.pages.length - 1 && project.pages.length > 1);
      const parts: SheetPart[] = group.map((idx, n) => {
        const onLeft = group.length === 2 ? n === 0 : hasLeft;
        return { render: renders[idx], dx: onLeft ? 0 : W, bleed: { l: 0, r: 0, t: 0, b: 0 } };
      });
      return { trimW: 2 * W, trimH: H, parts, bleed: 0 };
    });
  }
  // cover-wrap: back cover, spine, front cover
  const front = renders[0];
  const back = renders[renders.length - 1];
  const spine = spineWidthMm(project);
  const frontPage = project.pages[0];
  const color = frontPage.background.color;
  const parts: SheetPart[] = [];
  parts.push({ render: back, dx: 0, bleed: { l: b, r: 0, t: b, b } });
  parts.push({ render: front, dx: W + spine, bleed: { l: 0, r: b, t: b, b } });
  return [
    {
      trimW: 2 * W + spine,
      trimH: H,
      parts,
      spine: { x: W, w: spine, color, textColor: luminance(color) > 0.55 ? "#111111" : "#ffffff", title: project.title, font: resolveFont(project.theme.headingFont, project.theme.headingBold, false) },
      bleed: b,
    },
  ];
}

export function pdfPageCount(project: Pick<BookProject, "pages">, opts: Pick<PdfOptions, "scope">): number {
  if (opts.scope === "page") return 1;
  if (opts.scope === "all") return project.pages.length;
  if (opts.scope === "spreads") return spreadGroups(project.pages.length).length;
  return 1;
}

export interface ExportDeps {
  fonts: FontStore;
  images: PdfImageProvider;
}

/**
 * Writes the book to a PDF. Text is real, selectable vector text using embedded fonts; photos are
 * placed at their physical size inside clip paths, so nothing can spill onto the next page.
 */
export async function exportPdf(
  project: BookProject,
  deps: ExportDeps,
  options: PdfOptions,
  onProgress: (p: PdfProgress) => void = () => undefined,
  signal?: AbortSignal,
): Promise<PdfResult> {
  const { fonts, images } = deps;
  const check = () => {
    if (signal?.aborted) throw new PdfCancelled();
  };
  if (project.pages.length === 0) throw new PdfExportError("This book has no pages to export.");
  if (options.scope === "cover-wrap" && project.pages.length < 2) throw new PdfExportError("A cover needs at least a front and a back page.");

  onProgress({ stage: "preparing", fraction: 0, message: "Loading fonts" });
  // Fonts first: layout and embedding both depend on their metrics.
  const wanted = new Map<string, ResolvedFont>();
  for (const page of project.pages) for (const el of page.elements) if (el.type === "text") wanted.set(resolveFont(el.style.font, el.style.bold, el.style.italic).file, resolveFont(el.style.font, el.style.bold, el.style.italic));
  const headingFont = resolveFont(project.theme.headingFont, project.theme.headingBold, false);
  wanted.set(headingFont.file, headingFont);
  await Promise.all([...wanted.values()].map((f) => fonts.load(f)));
  check();

  const sources = new Map<string, { width: number; height: number }>();
  for (const page of project.pages) {
    for (const el of page.elements) if (el.type === "image" && el.sourceId) {
      const s = images.size(el.sourceId);
      if (s) sources.set(el.sourceId, s);
    }
    if (page.background.imageId) {
      const s = images.size(page.background.imageId);
      if (s) sources.set(page.background.imageId, s);
    }
  }
  const renders = project.pages.map((page, i) => renderPage(project, page, { measurer: fonts, sources, pageNumber: i + 1 }));

  const doc = await PDFDocument.create();
  const fontkit = (await import("@pdf-lib/fontkit")) as unknown as { default?: unknown };
  doc.registerFontkit((fontkit.default ?? fontkit) as Parameters<PDFDocument["registerFontkit"]>[0]);
  doc.setTitle(project.title || "Travel book");
  doc.setProducer("My Travel Memory");
  doc.setCreator("My Travel Memory");
  doc.setCreationDate(new Date());
  const writer = new Writer(doc, fonts);

  const dpi = options.quality === "print" ? TARGET_DPI : 150;
  const jpegQuality = options.quality === "print" ? 0.94 : 0.78;
  const sheets = planSheets(project, renders, options);
  const bleed = options.includeBleed ? project.settings.bleedMm : 0;
  const markArea = options.cropMarks ? MARK_AREA : 0;
  // Pad around the trim: bleed (when included) and room for crop marks.
  const pad = markArea + bleed;

  for (let s = 0; s < sheets.length; s++) {
    check();
    const sheet = sheets[s];
    const mediaW = sheet.trimW + 2 * pad;
    const mediaH = sheet.trimH + 2 * pad;
    const page = doc.addPage([mmToPt(mediaW), mmToPt(mediaH)]);
    const toPt = { x: (mm: number) => mmToPt(pad + mm), y: (mm: number) => mmToPt(mediaH - (pad + mm)) };

    page.setMediaBox(0, 0, mmToPt(mediaW), mmToPt(mediaH));
    page.setCropBox(0, 0, mmToPt(mediaW), mmToPt(mediaH));
    page.setTrimBox(mmToPt(pad), mmToPt(pad), mmToPt(sheet.trimW), mmToPt(sheet.trimH));
    page.setBleedBox(mmToPt(markArea), mmToPt(markArea), mmToPt(sheet.trimW + 2 * bleed), mmToPt(sheet.trimH + 2 * bleed));

    // Spine background goes first so covers draw over its edges.
    if (sheet.spine) {
      const sp = sheet.spine;
      page.drawRectangle({ x: toPt.x(sp.x), y: toPt.y(sheet.trimH + bleed), width: mmToPt(sp.w), height: mmToPt(sheet.trimH + 2 * bleed), color: hexToRgb(sp.color) });
    }

    for (const part of sheet.parts) {
      const geom = part.render.geometry;
      const left = part.bleed.l;
      const top = part.bleed.t;
      const clipRect: Rect = { x: part.dx - left, y: -top, w: geom.trim.w + left + part.bleed.r, h: geom.trim.h + top + part.bleed.b };
      page.pushOperators(pushGraphicsState(), rectangle(toPt.x(clipRect.x), toPt.y(clipRect.y + clipRect.h), mmToPt(clipRect.w), mmToPt(clipRect.h)), clip(), endPath());
      await drawItems(
        page,
        writer,
        part.render.items,
        { x: (mm) => toPt.x(mm + part.dx), y: (mm) => toPt.y(mm) },
        images,
        options,
        dpi,
        jpegQuality,
        signal,
      );
      page.pushOperators(popGraphicsState());
    }

    if (sheet.spine) {
      const sp = sheet.spine;
      if (sp.w >= 6) {
        const font = await writer.font(sp.font);
        const size = Math.min(14, mmToPt(sp.w) * 0.55);
        const width = font.widthOfTextAtSize(sp.title, size);
        page.drawText(sp.title, {
          x: toPt.x(sp.x + sp.w / 2) - size * 0.33,
          y: toPt.y(sheet.trimH * 0.12),
          size,
          font,
          color: hexToRgb(sp.textColor),
          rotate: degrees(-90),
        });
        void width;
      } else {
        writer.warnings.push(`The spine is only ${sp.w} mm wide, which is too narrow for a title. Add pages or use thicker paper settings.`);
      }
    }

    if (options.cropMarks) drawCropMarks(page, { x: mmToPt(pad), y: mmToPt(pad), w: mmToPt(sheet.trimW), h: mmToPt(sheet.trimH) }, mmToPt(bleed));

    onProgress({ stage: "pages", fraction: (s + 1) / sheets.length, message: `Page ${s + 1} of ${sheets.length}` });
    // Let the browser paint between pages so the progress bar and the page stay responsive.
    await new Promise((r) => setTimeout(r, 0));
  }

  check();
  onProgress({ stage: "saving", fraction: 1, message: "Saving the PDF" });
  const bytes = await doc.save();
  const sizes = sheets.map((sh) => ({ widthMm: sh.trimW + 2 * pad, heightMm: sh.trimH + 2 * pad }));
  return { bytes, pageCount: sheets.length, sizes, warnings: [...new Set(writer.warnings)] };
}

export type { BookPage };
