import { newId, makeImage, makePage, makeShape, makeText, roleStyle, scaleFor, resolveColor } from "./elements";
import { containRect, originalFrame, type SourceSize } from "./image-fit";
import { applyLayout, getLayout, layoutCtx } from "./layouts";
import { neededHeight, layoutText, type Measurer } from "./text-layout";
import type { BookElement, BookPage, BookProject, BookSettings, BookSource, BookTheme, ImageElement, PageKind, ShapeElement, TextElement, TextRole } from "./types";
import { clamp, LIMITS, pageGeometry, type PageGeometry, type Rect } from "./units";
import { projectGeometry } from "./display-list";
import { refreshContents, syncFolios } from "./templates";

export const touch = (p: BookProject): BookProject => ({ ...p, updatedAt: Date.now() });

/** Page list changes can alter page numbers and the contents page, so refresh those too. */
const finish = (p: BookProject): BookProject => touch(syncFolios(refreshContents(p)));

export function updatePage(project: BookProject, pageId: string, fn: (page: BookPage) => BookPage): BookProject {
  return finish({ ...project, pages: project.pages.map((p) => (p.id === pageId ? fn(p) : p)) });
}

export function updateElement<T extends BookElement>(project: BookProject, pageId: string, elementId: string, patch: Partial<T>): BookProject {
  return updatePage(project, pageId, (page) => ({ ...page, elements: page.elements.map((e) => (e.id === elementId ? ({ ...e, ...patch } as BookElement) : e)) }));
}

/** Keeps a frame inside `bounds`: it can be moved and resized, but never pushed off the page. */
export function clampFrame(frame: Rect, bounds: Rect, minSize: number = LIMITS.minElementMm): Rect {
  const w = clamp(frame.w, minSize, bounds.w);
  const h = clamp(frame.h, minSize, bounds.h);
  return { x: clamp(frame.x, bounds.x, bounds.x + bounds.w - w), y: clamp(frame.y, bounds.y, bounds.y + bounds.h - h), w, h };
}

/** The area an element may occupy on this page. */
export function boundsFor(el: BookElement, page: BookPage, geom: PageGeometry): Rect {
  return el.type === "image" && el.fullBleed && page.fullBleed ? geom.bleed : geom.trim;
}

// -- pages ----------------------------------------------------------------------------------------

export function addPage(project: BookProject, index: number, layoutKey: string | null = "photo-only", kind: PageKind = "content", sizes?: ReadonlyMap<string, SourceSize>): { project: BookProject; page: BookPage } {
  if (project.pages.length >= LIMITS.maxPages) return { project, page: project.pages[Math.min(index, project.pages.length - 1)] };
  const blank = makePage(kind, project.theme, { section: project.pages[index - 1]?.section ?? "" });
  const page = layoutKey ? applyLayout(blank, layoutKey, project.theme, project.settings, sizes).page : blank;
  const pages = [...project.pages];
  pages.splice(clamp(index, 0, pages.length), 0, page);
  return { project: finish({ ...project, pages }), page };
}

function cloneElement<T extends BookElement>(el: T): T {
  return { ...el, id: newId(el.type === "image" ? "i" : el.type === "text" ? "t" : "s"), frame: { ...el.frame } } as T;
}

export function duplicatePage(project: BookProject, pageId: string): { project: BookProject; page: BookPage | null } {
  const index = project.pages.findIndex((p) => p.id === pageId);
  if (index < 0 || project.pages.length >= LIMITS.maxPages) return { project, page: null };
  const src = project.pages[index];
  const copy: BookPage = {
    ...src,
    id: newId("p"),
    elements: src.elements.map((e) => cloneElement(e)),
    unplaced: src.unplaced.map((e) => cloneElement(e)),
    background: { ...src.background },
  };
  const pages = [...project.pages];
  pages.splice(index + 1, 0, copy);
  return { project: finish({ ...project, pages }), page: copy };
}

export function deletePage(project: BookProject, pageId: string): BookProject {
  if (project.pages.length <= 1) return project;
  return finish({ ...project, pages: project.pages.filter((p) => p.id !== pageId) });
}

export function movePage(project: BookProject, from: number, to: number): BookProject {
  if (from === to || from < 0 || from >= project.pages.length) return project;
  const pages = [...project.pages];
  const [p] = pages.splice(from, 1);
  pages.splice(clamp(to, 0, pages.length), 0, p);
  return finish({ ...project, pages });
}

export function setPageLayout(project: BookProject, pageId: string, layoutKey: string, sizes?: ReadonlyMap<string, SourceSize>): { project: BookProject; unplaced: number; empty: number } {
  let unplaced = 0;
  let empty = 0;
  const next = updatePage(project, pageId, (page) => {
    const res = applyLayout(page, layoutKey, project.theme, project.settings, sizes);
    unplaced = res.unplacedImages + res.unplacedTexts;
    empty = res.emptyImageSlots;
    return res.page;
  });
  return { project: next, unplaced, empty };
}

/** Puts an unplaced item back on the page in a free spot (images contain-fit; text in a new box). */
export function placeUnplaced(project: BookProject, pageId: string, elementId: string): BookProject {
  const geom = projectGeometry(project);
  return updatePage(project, pageId, (page) => {
    const item = page.unplaced.find((e) => e.id === elementId);
    if (!item) return page;
    const c = geom.content;
    const placed: BookElement =
      item.type === "image"
        ? { ...item, mode: "contain", frame: clampFrame({ x: c.x + c.w * 0.2, y: c.y + c.h * 0.2, w: c.w * 0.5, h: c.h * 0.35 }, geom.trim) }
        : item.type === "text"
          ? { ...item, frame: clampFrame({ x: c.x, y: c.y + c.h * 0.8, w: c.w, h: c.h * 0.18 }, geom.trim) }
          : item;
    return { ...page, elements: [...page.elements, placed], unplaced: page.unplaced.filter((e) => e.id !== elementId) };
  });
}

export function discardUnplaced(project: BookProject, pageId: string, elementId?: string): BookProject {
  return updatePage(project, pageId, (page) => ({ ...page, unplaced: elementId ? page.unplaced.filter((e) => e.id !== elementId) : [] }));
}

/** Moves unplaced items onto a new page right after this one, so nothing is lost. */
export function unplacedToNewPage(project: BookProject, pageId: string): { project: BookProject; page: BookPage | null } {
  const index = project.pages.findIndex((p) => p.id === pageId);
  const src = project.pages[index];
  if (!src || src.unplaced.length === 0) return { project, page: null };
  const images = src.unplaced.filter((e): e is ImageElement => e.type === "image");
  const texts = src.unplaced.filter((e): e is TextElement => e.type === "text");
  const layout = images.length >= 4 ? "four-grid" : images.length === 3 ? "three-editorial" : images.length === 2 ? "two-side" : images.length === 1 ? "photo-caption" : "text-page";
  const fresh = makePage("content", project.theme, { section: src.section, elements: [...images, ...texts] });
  const page = applyLayout(fresh, layout, project.theme, project.settings).page;
  const pages = [...project.pages];
  pages[index] = { ...src, unplaced: [] };
  pages.splice(index + 1, 0, page);
  return { project: finish({ ...project, pages }), page };
}

// -- elements ----------------------------------------------------------------------------------------

export function addElement(project: BookProject, pageId: string, el: BookElement): BookProject {
  return updatePage(project, pageId, (page) => ({ ...page, elements: [...page.elements, el] }));
}

export function removeElement(project: BookProject, pageId: string, elementId: string): BookProject {
  return updatePage(project, pageId, (page) => ({ ...page, elements: page.elements.filter((e) => e.id !== elementId) }));
}

export function duplicateElement(project: BookProject, pageId: string, elementId: string): { project: BookProject; id: string | null } {
  let id: string | null = null;
  const geom = projectGeometry(project);
  const next = updatePage(project, pageId, (page) => {
    const src = page.elements.find((e) => e.id === elementId);
    if (!src) return page;
    const copy = cloneElement(src);
    copy.frame = clampFrame({ ...copy.frame, x: copy.frame.x + 5, y: copy.frame.y + 5 }, boundsFor(copy, page, geom));
    id = copy.id;
    return { ...page, elements: [...page.elements, copy] };
  });
  return { project: next, id };
}

export type LayerMove = "front" | "back" | "forward" | "backward";

export function moveLayer(project: BookProject, pageId: string, elementId: string, move: LayerMove): BookProject {
  return updatePage(project, pageId, (page) => {
    const i = page.elements.findIndex((e) => e.id === elementId);
    if (i < 0) return page;
    const els = [...page.elements];
    const [el] = els.splice(i, 1);
    const to = move === "front" ? els.length : move === "back" ? 0 : move === "forward" ? Math.min(els.length, i + 1) : Math.max(0, i - 1);
    els.splice(to, 0, el);
    return { ...page, elements: els };
  });
}

export type AlignTo = "left" | "center" | "right" | "top" | "middle" | "bottom";

export function alignElement(project: BookProject, pageId: string, elementId: string, to: AlignTo): BookProject {
  const geom = projectGeometry(project);
  return updatePage(project, pageId, (page) => ({
    ...page,
    elements: page.elements.map((e) => {
      if (e.id !== elementId) return e;
      const b = geom.content;
      const f = { ...e.frame };
      if (to === "left") f.x = b.x;
      if (to === "center") f.x = geom.trim.w / 2 - f.w / 2;
      if (to === "right") f.x = b.x + b.w - f.w;
      if (to === "top") f.y = b.y;
      if (to === "middle") f.y = geom.trim.h / 2 - f.h / 2;
      if (to === "bottom") f.y = b.y + b.h - f.h;
      return { ...e, frame: clampFrame(f, boundsFor(e, page, geom)) } as BookElement;
    }),
  }));
}

export function newTextElement(project: BookProject, role: TextRole, text = ""): TextElement {
  const { k, kb } = scaleFor(project.settings.widthMm, project.settings.heightMm);
  const geom = projectGeometry(project);
  const c = geom.content;
  const style = roleStyle(role, project.theme, k, kb);
  const h = role === "title" ? c.h * 0.16 : role === "body" ? c.h * 0.3 : c.h * 0.1;
  return makeText(role, { x: c.x, y: c.y + c.h * 0.4, w: c.w, h }, text, style);
}

export function newImageElement(project: BookProject, source: BookSource | null): ImageElement {
  const geom = projectGeometry(project);
  const c = geom.content;
  const aspect = source ? source.width / source.height : 1.5;
  let w = c.w * 0.6;
  let h = w / aspect;
  if (h > c.h * 0.6) {
    h = c.h * 0.6;
    w = h * aspect;
  }
  return makeImage({ x: c.x + (c.w - w) / 2, y: c.y + (c.h - h) / 2, w, h }, source?.id ?? null, { mode: "contain", alt: source?.caption || source?.name || "" });
}

export function newShapeElement(project: BookProject, shape: ShapeElement["shape"]): ShapeElement {
  const geom = projectGeometry(project);
  const c = geom.content;
  const accent = project.theme.accent;
  if (shape === "line") return makeShape("line", { x: c.x, y: c.y + c.h / 2, w: c.w * 0.5, h: 1 }, { stroke: accent, strokeMm: 0.5 });
  return makeShape(shape, { x: c.x + c.w * 0.25, y: c.y + c.h * 0.35, w: c.w * 0.5, h: c.h * 0.2 }, { fill: shape === "rect" || shape === "ellipse" ? accent : null, opacity: 0.9 });
}

/** The page photo frame for a source: sized to the photo's own proportions, inside the safe area. */
export function setImageMode(project: BookProject, pageId: string, elementId: string, mode: ImageElement["mode"], source: BookSource | undefined): BookProject {
  const geom = projectGeometry(project);
  return updatePage(project, pageId, (page) => ({
    ...page,
    elements: page.elements.map((e) => {
      if (e.id !== elementId || e.type !== "image") return e;
      let next: ImageElement = { ...e, mode };
      // Back in a layout slot: Fill uses the whole slot; Fit-whole hugs the photo inside it.
      if (e.slot && source && mode === "fill") next = { ...next, frame: { ...e.slot } };
      if (e.slot && source && mode === "contain") next = { ...next, frame: containRect(e.slot, source.width / source.height) };
      if (mode === "original" && source) next = { ...next, frame: originalFrame(source, geom), fullBleed: false };
      if (mode === "full-page") next = { ...next, frame: page.fullBleed && e.fullBleed ? geom.bleed : geom.trim };
      if (mode === "custom" && !next.crop) next = { ...next, crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } };
      if (mode === "fill") next = { ...next, zoom: Math.max(1, next.zoom) };
      return next;
    }),
  }));
}

/** Largest text size (pt) at which the text fits its box, never above `maxPt`. */
export function fitTextSize(el: TextElement, measurer: Measurer, maxPt = el.style.sizePt, minPt = 5): number {
  let lo = minPt;
  let hi = maxPt;
  const fits = (pt: number) => !layoutText({ ...el, style: { ...el.style, sizePt: pt } }, { measurer }).overflow;
  if (fits(hi)) return Math.round(hi * 10) / 10;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo * 10) / 10;
}

/** Grows a text box downwards until its text fits, within the page. */
export function growTextBox(project: BookProject, el: TextElement, measurer: Measurer): Rect {
  const geom = projectGeometry(project);
  const need = neededHeight({ ...el, columns: 1 }, { measurer });
  const h = el.columns > 1 ? el.frame.h : need;
  return clampFrame({ ...el.frame, h: Math.max(el.frame.h, h) }, geom.trim);
}

// -- book-wide changes ----------------------------------------------------------------------------------

function mapColor(c: string | null | undefined, from: BookTheme, to: BookTheme): string | null | undefined {
  if (!c) return c;
  const l = c.toLowerCase();
  const pairs: [string, string][] = [
    [from.paper, to.paper],
    [from.ink, to.ink],
    [from.muted, to.muted],
    [from.accent, to.accent],
    [from.accent2, to.accent2],
  ];
  for (const [a, b] of pairs) if (a.toLowerCase() === l) return b;
  return c;
}

/** Applies a theme to the whole book: fonts, colours and page backgrounds follow the new theme. */
export function applyTheme(project: BookProject, theme: BookTheme): BookProject {
  const from = project.theme;
  const fontMap = new Map<string, TextElement["style"]["font"]>([
    [from.headingFont, theme.headingFont],
    [from.bodyFont, theme.bodyFont],
    [from.scriptFont, theme.scriptFont],
    [from.labelFont, theme.labelFont],
  ]);
  const pages = project.pages.map((page) => ({
    ...page,
    background: { ...page.background, color: (mapColor(page.background.color, from, theme) ?? theme.paper) as string },
    elements: page.elements.map((e): BookElement => {
      if (e.type === "text") {
        const heading = e.style.font === from.headingFont && (e.role === "title" || e.role === "heading" || e.role === "quote");
        return {
          ...e,
          background: mapColor(e.background, from, theme) ?? undefined,
          style: {
            ...e.style,
            font: heading ? theme.headingFont : (fontMap.get(e.style.font) ?? e.style.font),
            color: (mapColor(e.style.color, from, theme) ?? e.style.color) as string,
            ...(heading ? { bold: theme.headingBold, italic: e.role === "quote" ? true : theme.headingItalic } : {}),
          },
        };
      }
      if (e.type === "shape") return { ...e, fill: mapColor(e.fill, from, theme) ?? null, stroke: mapColor(e.stroke, from, theme) ?? null };
      return { ...e, borderColor: (mapColor(e.borderColor, from, theme) ?? e.borderColor) as string, background: mapColor(e.background, from, theme) ?? undefined };
    }),
  }));
  return finish({ ...project, theme, pages });
}

/** Changes page size or margins. Pages built from a layout are re-laid out with their content kept; others are scaled. */
export function applySettings(project: BookProject, settings: BookSettings, sizes?: ReadonlyMap<string, SourceSize>): BookProject {
  const old = project.settings;
  const sx = settings.widthMm / old.widthMm;
  const sy = settings.heightMm / old.heightMm;
  const pages = project.pages.map((page) => {
    if (page.layoutKey && getLayout(page.layoutKey)) {
      const res = applyLayout(page, page.layoutKey, project.theme, settings, sizes);
      // Manual placements are lost on a size change, but photos and text are preserved.
      return res.page;
    }
    const scale = (e: BookElement): BookElement => ({ ...e, frame: { x: e.frame.x * sx, y: e.frame.y * sy, w: e.frame.w * sx, h: e.frame.h * sy } }) as BookElement;
    return { ...page, elements: page.elements.map(scale), unplaced: page.unplaced.map(scale) };
  });
  return finish({ ...project, settings, pages });
}

/** Copies the look of one page (background, text styling, photo styling) onto another. Content stays. */
export function copyPageFormat(project: BookProject, fromId: string, toId: string): BookProject {
  const from = project.pages.find((p) => p.id === fromId);
  if (!from) return project;
  const textStyles = new Map<TextRole, TextElement["style"]>();
  for (const e of from.elements) if (e.type === "text" && !textStyles.has(e.role)) textStyles.set(e.role, e.style);
  const firstImage = from.elements.find((e): e is ImageElement => e.type === "image");
  return updatePage(project, toId, (page) => ({
    ...page,
    background: { ...from.background },
    elements: page.elements.map((e): BookElement => {
      if (e.type === "text" && textStyles.has(e.role)) return { ...e, style: { ...textStyles.get(e.role)! } };
      if (e.type === "image" && firstImage) {
        return { ...e, radiusMm: firstImage.radiusMm, borderMm: firstImage.borderMm, borderColor: firstImage.borderColor, shadow: firstImage.shadow, filter: { ...firstImage.filter } };
      }
      return e;
    }),
  }));
}

/** Resets a page to what its layout gives, keeping photos and text. */
export function resetPageToLayout(project: BookProject, pageId: string, sizes?: ReadonlyMap<string, SourceSize>): BookProject {
  const page = project.pages.find((p) => p.id === pageId);
  if (!page?.layoutKey) return project;
  return setPageLayout(project, pageId, page.layoutKey, sizes).project;
}

export function geometryOf(project: BookProject): PageGeometry {
  const s = project.settings;
  return pageGeometry({ widthMm: s.widthMm, heightMm: s.heightMm }, s.bleedMm, s.marginMm, s.safeMm);
}

export { layoutCtx, resolveColor };

/** Shrinks any text that overflows its box (down to a readable minimum) so a new book starts without cut-off text. */
export function autoFitProject(project: BookProject, measurer: Measurer): BookProject {
  const pages = project.pages.map((page) => ({
    ...page,
    elements: page.elements.map((el): BookElement => {
      if (el.type !== "text" || el.field !== "none" || !el.text.trim()) return el;
      if (!layoutText(el, { measurer }).overflow) return el;
      const min = el.role === "body" ? 7 : el.role === "caption" ? 6.5 : 8;
      const sizePt = fitTextSize(el, measurer, el.style.sizePt, min);
      return { ...el, style: { ...el.style, sizePt } };
    }),
  }));
  return { ...project, pages, needsFit: false };
}
