import type { PageRender } from "./display-list";
import type { BookPage, BookProject, TextElement } from "./types";
import { outsideFraction, rectContains, type Rect } from "./units";

export type Severity = "error" | "warning" | "info";

export type IssueCode =
  | "text-overflow"
  | "text-outside-page"
  | "text-near-trim"
  | "image-outside-page"
  | "image-low-res"
  | "image-cropped"
  | "image-missing"
  | "empty-frame"
  | "missing-glyphs"
  | "unplaced-content"
  | "font-unavailable";

export interface Issue {
  id: string;
  severity: Severity;
  code: IssueCode;
  pageId: string;
  pageIndex: number;
  elementId?: string;
  message: string;
}

/** Below this the photo will look soft in print; 300 is the usual target. */
export const WARN_DPI = 150;
export const TARGET_DPI = 300;

function textBounds(layout: NonNullable<ReturnType<PageRender["layouts"]["get"]>>): Rect | null {
  if (!layout.lines.length) return null;
  let x1 = Infinity;
  let x2 = -Infinity;
  let y1 = Infinity;
  let y2 = -Infinity;
  for (const line of layout.lines) {
    for (const seg of line.segments) {
      x1 = Math.min(x1, seg.x);
      x2 = Math.max(x2, seg.x + line.width);
    }
    y1 = Math.min(y1, line.y - layout.sizeMm * 0.8);
    y2 = Math.max(y2, line.y + layout.sizeMm * 0.25);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Checks one rendered page for things that would print badly. Nothing is changed or hidden. */
export function lintPage(project: BookProject, page: BookPage, pageIndex: number, render: PageRender): Issue[] {
  const issues: Issue[] = [];
  const { geometry: geom } = render;
  const add = (severity: Severity, code: IssueCode, message: string, elementId?: string) =>
    issues.push({ id: `${page.id}:${code}:${elementId ?? ""}:${issues.length}`, severity, code, pageId: page.id, pageIndex, elementId, message });
  const label = `Page ${pageIndex + 1}`;

  for (const el of page.elements) {
    if (el.type === "image") {
      if (!el.sourceId) {
        add("info", "empty-frame", `${label}: a photo frame is empty. It won't print anything.`, el.id);
        continue;
      }
      if (render.missingSources.includes(el.id)) {
        add("error", "image-missing", `${label}: a photo couldn't be found or loaded.`, el.id);
        continue;
      }
      const p = render.placements.get(el.id);
      if (!p) continue;
      const allowed = el.fullBleed && page.fullBleed ? geom.bleed : geom.trim;
      if (!rectContains(allowed, p.frame, 0.2) || (el.mode !== "fill" && el.mode !== "full-page" && outsideFraction(allowed, p.dest) > 0.002 && el.mode !== "custom")) {
        add("error", "image-outside-page", `${label}: a photo reaches past the edge of the page. The part outside would be cut off, so move or resize it.`, el.id);
      }
      if (p.effectiveDpi < WARN_DPI) {
        add("warning", "image-low-res", `${label}: a photo prints at only about ${Math.round(p.effectiveDpi)} DPI at this size (300 is best). Make it smaller or use a larger original.`, el.id);
      } else if (p.effectiveDpi < TARGET_DPI) {
        add("info", "image-low-res", `${label}: a photo prints at about ${Math.round(p.effectiveDpi)} DPI. That's fine for most prints; 300 is the ideal.`, el.id);
      }
      if (p.isCropped) {
        add("info", "image-cropped", `${label}: about ${Math.round(p.croppedFraction * 100)}% of a photo is hidden by cropping.`, el.id);
      }
    } else if (el.type === "text") {
      const layout = render.layouts.get(el.id);
      if (!layout) continue;
      if (!rectContains(geom.trim, el.frame, 0.2)) {
        add("error", "text-outside-page", `${label}: a text box reaches past the edge of the page.`, el.id);
      }
      if (layout.overflow) {
        add("warning", "text-overflow", `${label}: some text doesn't fit its box (${layout.hiddenLines} line${layout.hiddenLines === 1 ? "" : "s"} hidden). Enlarge the box, make the text smaller or shorten it.`, el.id);
      }
      if (layout.missingGlyphs.length) {
        add("warning", "missing-glyphs", `${label}: this font can't show ${layout.missingGlyphs.slice(0, 6).join(" ")}. Choose another font or remove those characters.`, el.id);
      }
      const b = textBounds(layout);
      if (b && el.field === "none" && !rectContains(geom.safe, b, 0.3) && page.kind !== "cover" && !page.fullBleed) {
        add("warning", "text-near-trim", `${label}: some text is closer than ${project.settings.safeMm} mm to the trimmed edge and might be cut off when the book is printed.`, el.id);
      }
    }
  }
  if (page.unplaced.length) {
    add("warning", "unplaced-content", `${label}: ${page.unplaced.length} item${page.unplaced.length === 1 ? "" : "s"} didn't fit the layout and ${page.unplaced.length === 1 ? "isn't" : "aren't"} shown. Place or discard ${page.unplaced.length === 1 ? "it" : "them"}.`);
  }
  return issues;
}

export function summarize(issues: Issue[]): { errors: number; warnings: number; infos: number } {
  return {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    infos: issues.filter((i) => i.severity === "info").length,
  };
}

export function textElements(page: BookPage): TextElement[] {
  return page.elements.filter((e): e is TextElement => e.type === "text");
}
