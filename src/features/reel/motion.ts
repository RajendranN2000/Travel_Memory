import { clamp } from "./config";
import type { MotionKey } from "./types";

/** Camera state for a clip: zoom >= 1, pan in -1..1 of the available slack. */
export interface CameraPose {
  zoom: number;
  panX: number;
  panY: number;
}

interface Path {
  from: CameraPose;
  to: CameraPose;
}

const pose = (zoom: number, panX = 0, panY = 0): CameraPose => ({ zoom, panX, panY });

/** Distances are for intensity 1; `cameraAt` scales them. */
const PATHS: Record<MotionKey, Path> = {
  none: { from: pose(1), to: pose(1) },
  "zoom-in": { from: pose(1), to: pose(1.14) },
  "zoom-out": { from: pose(1.14), to: pose(1) },
  "ken-burns": { from: pose(1.02, -0.6, 0.35), to: pose(1.18, 0.6, -0.35) },
  "pan-left": { from: pose(1.1, 0.8), to: pose(1.1, -0.8) },
  "pan-right": { from: pose(1.1, -0.8), to: pose(1.1, 0.8) },
  "pan-up": { from: pose(1.1, 0, 0.8), to: pose(1.1, 0, -0.8) },
  "pan-down": { from: pose(1.1, 0, -0.8), to: pose(1.1, 0, 0.8) },
  "push-in": { from: pose(1), to: pose(1.32, 0, -0.1) },
  "pull-out": { from: pose(1.32, 0, -0.1), to: pose(1) },
  parallax: { from: pose(1.04, -0.5, 0), to: pose(1.1, 0.5, 0) },
};

export const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * clamp(t, 0, 1)) / 2;
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/**
 * Camera pose at progress `p` (0-1). `intensity` scales how far the camera
 * travels away from the resting pose; 0 holds still.
 */
export function cameraAt(motion: MotionKey, p: number, intensity: number): CameraPose {
  const path = PATHS[motion] ?? PATHS.none;
  const e = easeInOut(p);
  const k = clamp(intensity, 0, 2.5);
  const lerp = (a: number, b: number) => a + (b - a) * e;
  return {
    zoom: Math.max(1, lerp(1 + (path.from.zoom - 1) * k, 1 + (path.to.zoom - 1) * k)),
    panX: clamp(lerp(path.from.panX * k, path.to.panX * k), -1, 1),
    panY: clamp(lerp(path.from.panY * k, path.to.panY * k), -1, 1),
  };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The part of the source image (in source pixels) that is visible. It always
 * stays inside the image, so the frame never shows empty edges. `focusX/Y`
 * (0-100) say where the photo's subject sits.
 */
export function sourceWindow(
  srcW: number,
  srcH: number,
  frameW: number,
  frameH: number,
  camera: CameraPose,
  focusX = 50,
  focusY = 50,
): Rect {
  const frameAspect = frameW / frameH;
  const srcAspect = srcW / srcH;
  let baseW: number;
  let baseH: number;
  if (srcAspect > frameAspect) {
    baseH = srcH;
    baseW = srcH * frameAspect;
  } else {
    baseW = srcW;
    baseH = srcW / frameAspect;
  }
  const w = baseW / camera.zoom;
  const h = baseH / camera.zoom;
  const slackX = srcW - w;
  const slackY = srcH - h;
  const centreX = (clamp(focusX, 0, 100) / 100) * srcW;
  const centreY = (clamp(focusY, 0, 100) / 100) * srcH;
  const x = clamp(centreX - w / 2 + (camera.panX * slackX) / 2, 0, Math.max(0, slackX));
  const y = clamp(centreY - h / 2 + (camera.panY * slackY) / 2, 0, Math.max(0, slackY));
  return { x, y, w, h };
}
