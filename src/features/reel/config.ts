import type { AspectKey, FpsOption, ResolutionKey } from "./types";

export const ASPECT_INFO: Record<AspectKey, { label: string; use: string; w: number; h: number }> = {
  "9:16": { label: "9:16", use: "Reels, TikTok, Shorts", w: 9, h: 16 },
  "4:5": { label: "4:5", use: "Instagram feed", w: 4, h: 5 },
  "16:9": { label: "16:9", use: "Landscape", w: 16, h: 9 },
  "1:1": { label: "1:1", use: "Square", w: 1, h: 1 },
};

export const RESOLUTION_SHORT_EDGE: Record<ResolutionKey, number> = { "720p": 720, "1080p": 1080 };

export const LIMITS = {
  minClipMs: 800,
  maxClipMs: 15_000,
  minTransitionMs: 200,
  maxTransitionMs: 2_000,
  minTextMs: 500,
  maxClips: 120,
  /** Photos are decoded at most this many pixels on the long edge for preview */
  previewLongEdge: { low: 640, medium: 960, high: 1280 },
} as const;

export type PreviewQuality = keyof typeof LIMITS.previewLongEdge;

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Pixel size of the frame. The shorter side matches the chosen resolution; both sides are even for H.264. */
export function outputSize(aspect: AspectKey, resolution: ResolutionKey): { width: number; height: number } {
  const { w, h } = ASPECT_INFO[aspect];
  const short = RESOLUTION_SHORT_EDGE[resolution];
  if (w === h) return { width: short, height: short };
  if (w < h) return { width: even(short), height: even((short * h) / w) };
  return { width: even((short * w) / h), height: even(short) };
}

/** Preview canvas size: same aspect ratio as the export, long edge limited by the preview quality. */
export function previewSize(aspect: AspectKey, quality: PreviewQuality): { width: number; height: number } {
  const { w, h } = ASPECT_INFO[aspect];
  const long = LIMITS.previewLongEdge[quality];
  const scale = long / Math.max(w, h);
  return { width: even(w * scale), height: even(h * scale) };
}

/** A sensible H.264 / VP9 bitrate for travel footage with lots of fine detail. */
export function videoBitrate(width: number, height: number, fps: FpsOption): number {
  const bits = width * height * fps * 0.11;
  return Math.round(Math.min(24_000_000, Math.max(2_500_000, bits)));
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatTimecode(ms: number): string {
  const safe = Math.max(0, ms);
  const m = Math.floor(safe / 60_000);
  const s = Math.floor((safe % 60_000) / 1000);
  const t = Math.floor((safe % 1000) / 100);
  return `${m}:${String(s).padStart(2, "0")}.${t}`;
}

/**
 * Rough size of the finished file. Real size depends on the encoder and how busy the picture is.
 */
export function estimateFileSizeMb(durationMs: number, bitrate: number): number {
  return Math.max(0.1, (bitrate * (durationMs / 1000)) / 8 / 1_000_000);
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
