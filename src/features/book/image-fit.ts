import type { ImageElement } from "./types";
import { clamp, MM_PER_INCH, rectBottom, rectRight, type PageGeometry, type Rect } from "./units";

/** Pixel size of the source photo, as far as the layout is concerned. */
export interface SourceSize {
  width: number;
  height: number;
}

export interface ImagePlacement {
  /** The area the finished photo is visible in. Never larger than the allowed page area. */
  clip: Rect;
  /** Where the whole source image would be drawn (mm). May extend beyond `clip`; it is clipped. */
  dest: Rect;
  /** The visible part of the source, as fractions (0-1) */
  visible: Rect;
  /** Share of the source image that is hidden by cropping (0-1) */
  croppedFraction: number;
  /** Source pixels per inch at the printed size */
  effectiveDpi: number;
  /** The frame this placement was computed for (full-page ignores the stored frame) */
  frame: Rect;
  /** True when part of the photo is hidden */
  isCropped: boolean;
}

export function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(rectRight(a), rectRight(b));
  const bt = Math.min(rectBottom(a), rectBottom(b));
  return { x, y, w: Math.max(0, r - x), h: Math.max(0, bt - y) };
}

/** The most a photo may cover on this page: the trim box, or the bleed box when it is a full-bleed photo. */
export function allowedArea(el: Pick<ImageElement, "fullBleed">, geom: PageGeometry, pageFullBleed: boolean): Rect {
  return el.fullBleed && pageFullBleed ? geom.bleed : geom.trim;
}

/** The frame a full-page photo occupies. */
export function fullPageFrame(el: Pick<ImageElement, "fullBleed">, geom: PageGeometry, pageFullBleed: boolean): Rect {
  return allowedArea(el, geom, pageFullBleed);
}

export function containRect(frame: Rect, aspect: number): Rect {
  const fa = frame.w / frame.h;
  const w = fa > aspect ? frame.h * aspect : frame.w;
  const h = fa > aspect ? frame.h : frame.w / aspect;
  return { x: frame.x + (frame.w - w) / 2, y: frame.y + (frame.h - h) / 2, w, h };
}

/**
 * Works out exactly where a photo is drawn and what part of it is visible. Photos are never
 * stretched: each mode keeps the source aspect ratio, and the only way to lose picture is to
 * choose Fill (or a custom crop), which is reported as `croppedFraction`.
 */
export function placeImage(el: ImageElement, src: SourceSize, geom: PageGeometry, pageFullBleed: boolean): ImagePlacement {
  const aspect = src.width / src.height;
  const allowed = allowedArea(el, geom, pageFullBleed);
  const frame = el.mode === "full-page" ? fullPageFrame(el, geom, pageFullBleed) : el.frame;

  const cover = el.mode === "fill" || (el.mode === "full-page" && el.coverPage);

  let clip: Rect;
  let dest: Rect;
  let visible: Rect;

  if (cover) {
    // Fill the frame; crop only inside it. Focus + zoom decide which part stays.
    const zoom = Math.max(1, el.zoom);
    const coverScale = Math.max(frame.w / src.width, frame.h / src.height) * zoom; // mm per source px
    const dw = src.width * coverScale;
    const dh = src.height * coverScale;
    const fx = clamp(el.focusX, 0, 1);
    const fy = clamp(el.focusY, 0, 1);
    const x = frame.x + clamp(frame.w / 2 - fx * dw, frame.w - dw, 0);
    const y = frame.y + clamp(frame.h / 2 - fy * dh, frame.h - dh, 0);
    dest = { x, y, w: dw, h: dh };
    clip = { ...frame };
    visible = { x: (frame.x - x) / dw, y: (frame.y - y) / dh, w: frame.w / dw, h: frame.h / dh };
  } else if (el.mode === "custom" && el.crop) {
    const c = {
      x: clamp(el.crop.x, 0, 1),
      y: clamp(el.crop.y, 0, 1),
      w: clamp(el.crop.w, 0.02, 1),
      h: clamp(el.crop.h, 0.02, 1),
    };
    c.w = Math.min(c.w, 1 - c.x);
    c.h = Math.min(c.h, 1 - c.y);
    const cropAspect = (c.w * src.width) / (c.h * src.height);
    const fitted = containRect(frame, cropAspect);
    const scale = fitted.w / (c.w * src.width);
    dest = { x: fitted.x - c.x * src.width * scale, y: fitted.y - c.y * src.height * scale, w: src.width * scale, h: src.height * scale };
    clip = fitted;
    visible = c;
  } else {
    // contain, original and full-page without cover: the whole photo, centred, with space around it if the shapes differ.
    const fitted = containRect(frame, aspect);
    dest = fitted;
    clip = fitted;
    visible = { x: 0, y: 0, w: 1, h: 1 };
  }

  // Hard page boundary: whatever the frame says, nothing is drawn outside what this page allows.
  clip = intersect(clip, allowed);
  const croppedFraction = clamp(1 - visible.w * visible.h, 0, 1);
  const widthMm = Math.max(1e-6, (visible.w * dest.w) / visible.w);
  void widthMm;
  const printedWidthMm = Math.max(1e-6, dest.w * visible.w);
  const effectiveDpi = (src.width * visible.w) / (printedWidthMm / MM_PER_INCH);
  return { clip, dest, visible, croppedFraction, effectiveDpi, frame, isCropped: croppedFraction > 0.002 };
}

/** The frame for "Original proportions": the whole photo, as large as fits the safe area, centred. */
export function originalFrame(src: SourceSize, geom: PageGeometry): Rect {
  return containRect(geom.safe, src.width / src.height);
}

/** Crop rectangle (fractions) that fills `frameAspect` and is centred on a focus point. */
export function coverCrop(src: SourceSize, frameAspect: number, focusX = 0.5, focusY = 0.5, zoom = 1): Rect {
  const srcAspect = src.width / src.height;
  let w = srcAspect > frameAspect ? frameAspect / srcAspect : 1;
  let h = srcAspect > frameAspect ? 1 : srcAspect / frameAspect;
  w /= Math.max(1, zoom);
  h /= Math.max(1, zoom);
  return { x: clamp(focusX - w / 2, 0, 1 - w), y: clamp(focusY - h / 2, 0, 1 - h), w, h };
}
