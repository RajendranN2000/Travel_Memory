import { resolveFont, type ResolvedFont } from "./fonts";
import type { TextElement } from "./types";
import { ptToMm, type Rect } from "./units";

/** What text layout needs from a font source. `FontStore` implements it. */
export interface Measurer {
  width(font: ResolvedFont, text: string, sizePt: number, trackingPt: number): number;
  metrics(font: ResolvedFont): { ascent: number; descent: number };
  hasGlyph(font: ResolvedFont, codePoint: number): boolean;
}

export interface TextSegment {
  text: string;
  /** Left edge in mm, page coordinates */
  x: number;
}

export interface TextLine {
  segments: TextSegment[];
  /** Baseline in mm, page coordinates */
  y: number;
  /** Width of the line in mm */
  width: number;
}

export interface TextLayout {
  lines: TextLine[];
  font: ResolvedFont;
  sizeMm: number;
  /** More text than the frame can hold */
  overflow: boolean;
  hiddenLines: number;
  /** Characters the chosen font has no glyph for */
  missingGlyphs: string[];
  /** The area the text is laid out in */
  inner: Rect;
}

export interface LayoutContext {
  measurer: Measurer;
  /** Value for page-number fields */
  pageNumber?: number;
}

export function elementText(el: TextElement, ctx: Pick<LayoutContext, "pageNumber">): string {
  if (el.field === "pageNumber") return ctx.pageNumber ? String(ctx.pageNumber) : "";
  return el.text;
}

interface Para {
  words: string[];
}

function splitParagraphs(text: string): Para[] {
  return text.replace(/\r\n?/g, "\n").split("\n").map((p) => ({ words: p.split(/[ \t]+/).filter(Boolean) }));
}

/** Breaks one paragraph into lines no wider than `maxMm`. Very long words are broken by character. */
function wrapParagraph(words: string[], maxMm: number, widthOf: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  const push = () => {
    if (line) lines.push(line);
    line = "";
  };
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (widthOf(candidate) <= maxMm + 1e-6) {
      line = candidate;
      continue;
    }
    push();
    if (widthOf(word) <= maxMm + 1e-6) {
      line = word;
      continue;
    }
    // A single word wider than the column: split it.
    let chunk = "";
    for (const ch of [...word]) {
      if (chunk && widthOf(chunk + ch) > maxMm) {
        lines.push(chunk);
        chunk = ch;
      } else chunk += ch;
    }
    line = chunk;
  }
  push();
  return lines;
}

/**
 * Lays text out inside its frame. The result is the single source of truth for line breaks:
 * the editor draws it and the PDF writes it, so they cannot disagree.
 */
export function layoutText(el: TextElement, ctx: LayoutContext): TextLayout {
  const { measurer } = ctx;
  const style = el.style;
  const font = resolveFont(style.font, style.bold, style.italic);
  const sizeMm = ptToMm(style.sizePt);
  const raw = elementText(el, ctx);
  const text = style.uppercase ? raw.toUpperCase() : raw;
  const pad = el.paddingMm;
  const inner: Rect = { x: el.frame.x + pad, y: el.frame.y + pad, w: Math.max(1, el.frame.w - 2 * pad), h: Math.max(1, el.frame.h - 2 * pad) };
  const cols = Math.max(1, Math.round(el.columns));
  const gap = cols > 1 ? el.columnGapMm : 0;
  const colW = (inner.w - gap * (cols - 1)) / cols;
  const lineH = sizeMm * style.lineHeight;
  const paraGap = ptToMm(style.paraSpacingPt);
  const { ascent, descent } = measurer.metrics(font);
  const widthOf = (s: string) => ptToMm(measurer.width(font, s, style.sizePt, style.trackingPt));

  const missing = new Set<string>();
  for (const ch of new Set([...text])) {
    const cp = ch.codePointAt(0)!;
    if (cp > 32 && !measurer.hasGlyph(font, cp)) missing.add(ch);
  }

  // Wrap everything first, remembering paragraph ends (for justify and spacing).
  type Flow = { text: string; lastOfPara: boolean; blank: boolean };
  const flow: Flow[] = [];
  for (const para of splitParagraphs(text)) {
    if (para.words.length === 0) {
      flow.push({ text: "", lastOfPara: true, blank: true });
      continue;
    }
    const wrapped = wrapParagraph(para.words, colW, widthOf);
    wrapped.forEach((t, i) => flow.push({ text: t, lastOfPara: i === wrapped.length - 1, blank: false }));
  }

  const baselineIn = (lineTop: number) => lineTop + (lineH - (ascent + descent) * sizeMm) / 2 + ascent * sizeMm;
  const lines: TextLine[] = [];
  let col = 0;
  let y = 0; // within the column
  let placed = 0;
  const colLines: TextLine[][] = Array.from({ length: cols }, () => []);

  for (let i = 0; i < flow.length; i++) {
    const item = flow[i];
    if (y + lineH > inner.h + 1e-6) {
      col += 1;
      y = 0;
      if (col >= cols) break;
    }
    // Do not leave a blank line at the very top of a column.
    if (item.blank && y === 0 && col > 0) continue;
    const colX = inner.x + col * (colW + gap);
    if (!item.blank) {
      const w = widthOf(item.text);
      const wordsInLine = item.text.split(" ");
      let segments: TextSegment[];
      let lineWidth = w;
      if (style.align === "justify" && !item.lastOfPara && wordsInLine.length > 1) {
        const wordsW = wordsInLine.map(widthOf);
        const spaces = wordsInLine.length - 1;
        const space = (colW - wordsW.reduce((a, b) => a + b, 0)) / spaces;
        let x = colX;
        segments = wordsInLine.map((word, k) => {
          const seg = { text: word, x };
          x += wordsW[k] + space;
          return seg;
        });
        lineWidth = colW;
      } else {
        const x = style.align === "center" ? colX + (colW - w) / 2 : style.align === "right" ? colX + colW - w : colX;
        segments = [{ text: item.text, x }];
      }
      colLines[col].push({ segments, y: baselineIn(inner.y + y), width: lineWidth });
    }
    placed = i + 1;
    y += lineH + (item.lastOfPara ? paraGap : 0);
  }

  // Vertical alignment for single-column text.
  if (cols === 1 && colLines[0].length > 0) {
    const used = y - (flow[placed - 1]?.lastOfPara ? paraGap : 0);
    const free = Math.max(0, inner.h - used);
    const shift = el.valign === "middle" ? free / 2 : el.valign === "bottom" ? free : 0;
    if (shift) for (const l of colLines[0]) l.y += shift;
  }
  for (const c of colLines) lines.push(...c);

  const hidden = flow.slice(placed).filter((f) => !f.blank).length;
  return { lines, font, sizeMm, overflow: hidden > 0, hiddenLines: hidden, missingGlyphs: [...missing], inner };
}

/** Height in mm the text needs at its current width and size (single column). */
export function neededHeight(el: TextElement, ctx: LayoutContext): number {
  const tall: TextElement = { ...el, valign: "top", columns: 1, frame: { ...el.frame, h: 100000 } };
  const result = layoutText(tall, ctx);
  if (!result.lines.length) return el.style.sizePt > 0 ? ptToMm(el.style.sizePt * el.style.lineHeight) + 2 * el.paddingMm : 0;
  const last = result.lines[result.lines.length - 1];
  const { descent } = ctx.measurer.metrics(result.font);
  return last.y + descent * result.sizeMm - el.frame.y + el.paddingMm;
}
