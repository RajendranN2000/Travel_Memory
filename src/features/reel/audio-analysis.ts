import { clamp } from "./config";
import type { MusicSettings } from "./types";

/** Music gain (0-1) at video time `tMs`, including fades and mute. */
export function gainAt(tMs: number, totalMs: number, music: Pick<MusicSettings, "muted" | "volume" | "fadeInMs" | "fadeOutMs">): number {
  if (music.muted || totalMs <= 0) return 0;
  let g = clamp(music.volume, 0, 1);
  if (music.fadeInMs > 0 && tMs < music.fadeInMs) g *= clamp(tMs / music.fadeInMs, 0, 1);
  const fadeStart = totalMs - music.fadeOutMs;
  if (music.fadeOutMs > 0 && tMs > fadeStart) g *= clamp((totalMs - tMs) / music.fadeOutMs, 0, 1);
  return g;
}

export interface GainPoint {
  atMs: number;
  gain: number;
}

/**
 * The corners of the volume envelope from `fromMs` onward. The first point is
 * the current level; later points are joined with straight ramps.
 */
export function gainBreakpoints(fromMs: number, totalMs: number, music: MusicSettings): GainPoint[] {
  const corners = [fromMs, music.fadeInMs, totalMs - music.fadeOutMs, totalMs];
  const times = [...new Set(corners.filter((t) => t >= fromMs && t <= totalMs).map((t) => Math.round(t)))].sort((a, b) => a - b);
  return times.map((atMs) => ({ atMs, gain: gainAt(atMs, totalMs, music) }));
}

/** Largest absolute sample in each of `buckets` equal slices. */
export function computePeaks(data: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  if (!data.length || buckets <= 0) return out;
  const size = data.length / buckets;
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * size);
    const end = Math.min(data.length, Math.max(start + 1, Math.floor((b + 1) * size)));
    // Sample at most ~200 points per bucket; plenty for a waveform.
    const step = Math.max(1, Math.floor((end - start) / 200));
    let peak = 0;
    for (let i = start; i < end; i += step) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
    out[b] = peak;
  }
  return out;
}

export interface BeatInfo {
  bpm: number;
  beatMs: number;
  /** Time of the first beat */
  offsetMs: number;
}

const ENV_RATE = 100; // envelope frames per second
const MAX_ANALYSE_S = 90;

/**
 * A light tempo estimate: energy envelope -> onset strength -> autocorrelation
 * over 70-160 BPM. Good enough to snap cuts to the pulse of most music; returns
 * null when there is no clear pulse.
 */
export function detectBeat(data: Float32Array, sampleRate: number): BeatInfo | null {
  const limit = Math.min(data.length, Math.floor(sampleRate * MAX_ANALYSE_S));
  const hop = Math.max(1, Math.floor(sampleRate / ENV_RATE));
  const frames = Math.floor(limit / hop);
  if (frames < ENV_RATE * 8) return null;

  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const base = f * hop;
    for (let i = 0; i < hop; i++) {
      const v = data[base + i];
      sum += v * v;
    }
    env[f] = Math.sqrt(sum / hop);
  }
  const onset = new Float32Array(frames);
  let mean = 0;
  for (let f = 1; f < frames; f++) {
    onset[f] = Math.max(0, env[f] - env[f - 1]);
    mean += onset[f];
  }
  mean /= frames;
  if (mean < 1e-6) return null;

  // Coarse tempo: autocorrelation over whole-frame lags between 160 and 70 BPM.
  const minLag = Math.round((60 / 160) * ENV_RATE);
  const maxLag = Math.round((60 / 70) * ENV_RATE);
  let bestLag = 0;
  let bestScore = 0;
  let total = 0;
  let count = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let f = lag; f < frames; f++) score += onset[f] * onset[f - lag];
    score /= frames - lag;
    total += score;
    count += 1;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  // Require a clear peak over the average, otherwise there is no steady beat.
  if (!bestLag || bestScore < (total / count) * 1.25) return null;

  // Fine tempo and phase: slide a comb of beats over the onsets, trying fractional periods.
  let bestPeriod = bestLag;
  let bestPhase = 0;
  let bestSum = -1;
  for (let period = bestLag - 0.6; period <= bestLag + 0.6; period += 0.02) {
    for (let phase = 0; phase < period; phase += 1) {
      let sum = 0;
      for (let t = phase; t < frames; t += period) sum += onset[Math.round(t)] ?? 0;
      if (sum > bestSum) {
        bestSum = sum;
        bestPeriod = period;
        bestPhase = phase;
      }
    }
  }
  const beatMs = Math.round((bestPeriod / ENV_RATE) * 1000);
  return { bpm: Math.round((60_000 / beatMs) * 10) / 10, beatMs, offsetMs: Math.round((bestPhase / ENV_RATE) * 1000) };
}
