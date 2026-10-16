import type { ImageFilter } from "./types";

/** 4x5 colour matrix in row-major order, values for R, G, B, A rows (offsets are 0-1). */
export type ColorMatrix = number[];

const IDENTITY: ColorMatrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

export const DEFAULT_FILTER: ImageFilter = { preset: "none", brightness: 0, contrast: 0, saturation: 0 };

function multiply(a: ColorMatrix, b: ColorMatrix): ColorMatrix {
  // result = a applied after b
  const out = new Array<number>(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      let v = 0;
      for (let k = 0; k < 4; k++) v += a[row * 5 + k] * b[k * 5 + col];
      if (col === 4) v += a[row * 5 + 4];
      out[row * 5 + col] = v;
    }
  }
  return out;
}

function saturationMatrix(s: number): ColorMatrix {
  const r = 0.2126;
  const g = 0.7152;
  const b = 0.0722;
  return [
    r + (1 - r) * s, g - g * s, b - b * s, 0, 0,
    r - r * s, g + (1 - g) * s, b - b * s, 0, 0,
    r - r * s, g - g * s, b + (1 - b) * s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

const PRESETS: Record<ImageFilter["preset"], ColorMatrix> = {
  none: IDENTITY,
  bw: saturationMatrix(0),
  sepia: [
    0.393, 0.769, 0.189, 0, 0,
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0, 0, 0, 1, 0,
  ],
  warm: [1.08, 0, 0, 0, 0.02, 0, 1.0, 0, 0, 0, 0, 0, 0.9, 0, -0.01, 0, 0, 0, 1, 0],
  cool: [0.92, 0, 0, 0, -0.01, 0, 1.0, 0, 0, 0, 0, 0, 1.08, 0, 0.02, 0, 0, 0, 1, 0],
  vivid: multiply(saturationMatrix(1.35), [1.08, 0, 0, 0, -0.04, 0, 1.08, 0, 0, -0.04, 0, 0, 1.08, 0, -0.04, 0, 0, 0, 1, 0]),
  fade: multiply([0.92, 0, 0, 0, 0.06, 0, 0.92, 0, 0, 0.06, 0, 0, 0.92, 0, 0.06, 0, 0, 0, 1, 0], saturationMatrix(0.8)),
};

export function isNeutral(f: ImageFilter): boolean {
  return f.preset === "none" && f.brightness === 0 && f.contrast === 0 && f.saturation === 0;
}

/** One matrix for the preset plus the three sliders. Used by the preview (SVG) and the export (pixels). */
export function filterMatrix(f: ImageFilter): ColorMatrix {
  let m = PRESETS[f.preset] ?? IDENTITY;
  if (f.saturation !== 0) m = multiply(saturationMatrix(1 + f.saturation), m);
  if (f.contrast !== 0) {
    const c = 1 + f.contrast;
    const o = 0.5 * (1 - c);
    m = multiply([c, 0, 0, 0, o, 0, c, 0, 0, o, 0, 0, c, 0, o, 0, 0, 0, 1, 0], m);
  }
  if (f.brightness !== 0) {
    const b = f.brightness * 0.35;
    m = multiply([1, 0, 0, 0, b, 0, 1, 0, 0, b, 0, 0, 1, 0, b, 0, 0, 0, 1, 0], m);
  }
  return m;
}

/** Applies the filter to RGBA pixel data in place. */
export function applyFilterToPixels(data: Uint8ClampedArray, f: ImageFilter): void {
  if (isNeutral(f)) return;
  const m = filterMatrix(f);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    data[i] = (m[0] * r + m[1] * g + m[2] * b + m[4]) * 255;
    data[i + 1] = (m[5] * r + m[6] * g + m[7] * b + m[9]) * 255;
    data[i + 2] = (m[10] * r + m[11] * g + m[12] * b + m[14]) * 255;
  }
}

export const FILTER_LABELS: Record<ImageFilter["preset"], string> = {
  none: "Original",
  bw: "Black & white",
  sepia: "Sepia",
  warm: "Warm",
  cool: "Cool",
  vivid: "Vivid",
  fade: "Faded",
};
