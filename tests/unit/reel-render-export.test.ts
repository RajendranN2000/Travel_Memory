import { describe, expect, it } from "vitest";
import { computePeaks, detectBeat, gainAt, gainBreakpoints } from "@/features/reel/audio-analysis";
import { detectCapabilities, fpsWarning, type BrowserEnv } from "@/features/reel/capabilities";
import { estimateFileSizeMb, formatDuration, outputSize, previewSize, videoBitrate } from "@/features/reel/config";
import { cameraAt, sourceWindow } from "@/features/reel/motion";
import { neededSources } from "@/features/reel/scene";
import { layoutClips } from "@/features/reel/timeline";
import { decodeScale } from "@/features/reel/media-library";
import { wrapText } from "@/features/reel/renderer";
import type { Clip, MusicSettings } from "@/features/reel/types";

describe("output settings", () => {
  it("sizes every aspect ratio from the shorter edge with even dimensions", () => {
    expect(outputSize("9:16", "1080p")).toEqual({ width: 1080, height: 1920 });
    expect(outputSize("9:16", "720p")).toEqual({ width: 720, height: 1280 });
    expect(outputSize("4:5", "1080p")).toEqual({ width: 1080, height: 1350 });
    expect(outputSize("16:9", "1080p")).toEqual({ width: 1920, height: 1080 });
    expect(outputSize("16:9", "720p")).toEqual({ width: 1280, height: 720 });
    expect(outputSize("1:1", "720p")).toEqual({ width: 720, height: 720 });
    for (const a of ["9:16", "4:5", "16:9", "1:1"] as const) {
      const { width, height } = outputSize(a, "720p");
      expect(width % 2).toBe(0);
      expect(height % 2).toBe(0);
    }
  });

  it("keeps the preview in the same aspect ratio but lighter", () => {
    const p = previewSize("9:16", "medium");
    expect(p.height).toBe(960);
    expect(Math.abs(p.width / p.height - 9 / 16)).toBeLessThan(0.01);
    expect(previewSize("16:9", "low").width).toBe(640);
  });

  it("chooses a bitrate within sane bounds and estimates file size", () => {
    expect(videoBitrate(1080, 1920, 30)).toBeGreaterThan(videoBitrate(720, 1280, 30));
    expect(videoBitrate(100, 100, 24)).toBe(2_500_000);
    expect(videoBitrate(3840, 2160, 60)).toBe(24_000_000);
    expect(estimateFileSizeMb(10_000, 8_000_000)).toBeCloseTo(10, 5);
  });

  it("formats durations", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_400)).toBe("1:05");
  });
});

describe("export capability detection", () => {
  const base: BrowserEnv = { hasMediaRecorder: true, isTypeSupported: () => false, canCaptureCanvas: true, hasAudioContext: true };

  it("offers MP4 first when the browser can really write it", () => {
    const caps = detectCapabilities({ ...base, isTypeSupported: (m) => m.startsWith("video/mp4") || m.startsWith("video/webm") });
    expect(caps.canExport).toBe(true);
    expect(caps.preferred?.format).toBe("mp4");
    expect(caps.formats.map((f) => f.format)).toEqual(["mp4", "webm"]);
  });

  it("falls back to WebM and says so instead of claiming MP4", () => {
    const caps = detectCapabilities({ ...base, isTypeSupported: (m) => m.startsWith("video/webm") });
    expect(caps.preferred?.format).toBe("webm");
    expect(caps.formats.some((f) => f.format === "mp4")).toBe(false);
    expect(caps.notes.join(" ")).toMatch(/only save WebM/);
  });

  it("explains when nothing can be recorded", () => {
    expect(detectCapabilities({ ...base, hasMediaRecorder: false }).blocker).toMatch(/cannot record/);
    expect(detectCapabilities({ ...base, canCaptureCanvas: false }).canExport).toBe(false);
    const none = detectCapabilities(base);
    expect(none.canExport).toBe(false);
    expect(none.blocker).toMatch(/MP4 or WebM/);
  });

  it("survives codecs that throw, and warns about silent output without Web Audio", () => {
    const caps = detectCapabilities({
      ...base,
      hasAudioContext: false,
      isTypeSupported: (m) => {
        if (m.includes("avc1.640028")) throw new Error("bad codec string");
        return m === "video/webm";
      },
    });
    expect(caps.canExport).toBe(true);
    expect(caps.canMixAudio).toBe(false);
    expect(caps.notes.join(" ")).toMatch(/silent/);
  });

  it("warns about heavy 60 fps output only", () => {
    expect(fpsWarning(60, 1920, 1080)).toMatch(/60 fps/);
    expect(fpsWarning(30, 1920, 1080)).toBeNull();
    expect(fpsWarning(60, 720, 720)).toBeNull();
  });
});

describe("camera and framing", () => {
  it("holds still at zero intensity and never zooms out past the frame", () => {
    const c = cameraAt("ken-burns", 0.5, 0);
    expect(c).toEqual({ zoom: 1, panX: 0, panY: 0 });
    for (const m of ["zoom-out", "pull-out", "pan-left"] as const) {
      for (let p = 0; p <= 1; p += 0.1) expect(cameraAt(m, p, 1.5).zoom).toBeGreaterThanOrEqual(1);
    }
  });

  it("moves further with higher intensity", () => {
    expect(cameraAt("zoom-in", 1, 2).zoom).toBeGreaterThan(cameraAt("zoom-in", 1, 1).zoom);
    expect(cameraAt("zoom-in", 0, 1).zoom).toBeCloseTo(1, 5);
  });

  it("keeps the visible window inside the photo at every pose", () => {
    for (const [w, h, fw, fh] of [[4000, 3000, 1080, 1920], [3000, 4000, 1920, 1080], [6000, 1500, 1080, 1080]]) {
      for (const motion of ["ken-burns", "pan-left", "push-in", "pan-down"] as const) {
        for (let p = 0; p <= 1; p += 0.25) {
          const win = sourceWindow(w, h, fw, fh, cameraAt(motion, p, 2), 10, 90);
          expect(win.x).toBeGreaterThanOrEqual(0);
          expect(win.y).toBeGreaterThanOrEqual(0);
          expect(win.x + win.w).toBeLessThanOrEqual(w + 0.001);
          expect(win.y + win.h).toBeLessThanOrEqual(h + 0.001);
          expect(win.w / win.h).toBeCloseTo(fw / fh, 3);
        }
      }
    }
  });

  it("decodes small photos at full size and shrinks very large ones", () => {
    expect(decodeScale(1200, 800, 1080, 1920)).toBe(1);
    expect(decodeScale(8000, 6000, 1080, 1920)).toBeLessThan(0.5);
    expect(decodeScale(8000, 6000, 1080, 1920)).toBeGreaterThan(0);
  });

  it("wraps text on word boundaries and keeps explicit line breaks", () => {
    const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) } as unknown as CanvasRenderingContext2D;
    expect(wrapText(ctx, "one two three four", 100)).toEqual(["one two", "three four"]);
    expect(wrapText(ctx, "a\nb", 500)).toEqual(["a", "b"]);
    expect(wrapText(ctx, "supercalifragilistic", 50)).toEqual(["supercalifragilistic"]);
  });
});

describe("music", () => {
  const music: MusicSettings = { name: "x.mp3", muted: false, volume: 0.8, fadeInMs: 1000, fadeOutMs: 2000, trimStartMs: 0, trimEndMs: null, loop: true };

  it("applies volume, fade in, fade out and mute", () => {
    expect(gainAt(0, 10_000, music)).toBe(0);
    expect(gainAt(500, 10_000, music)).toBeCloseTo(0.4, 5);
    expect(gainAt(5000, 10_000, music)).toBeCloseTo(0.8, 5);
    expect(gainAt(9000, 10_000, music)).toBeCloseTo(0.4, 5);
    expect(gainAt(10_000, 10_000, music)).toBe(0);
    expect(gainAt(5000, 10_000, { ...music, muted: true })).toBe(0);
  });

  it("describes the volume envelope from any playhead position", () => {
    const from0 = gainBreakpoints(0, 10_000, music);
    expect(from0.map((p) => p.atMs)).toEqual([0, 1000, 8000, 10_000]);
    const mid = gainBreakpoints(9000, 10_000, music);
    expect(mid[0]).toEqual({ atMs: 9000, gain: expect.closeTo(0.4, 5) });
    expect(mid[mid.length - 1]).toEqual({ atMs: 10_000, gain: 0 });
  });

  it("computes waveform peaks", () => {
    const data = new Float32Array(1000);
    data[10] = 0.5;
    data[990] = -0.9;
    const peaks = computePeaks(data, 10);
    expect(peaks).toHaveLength(10);
    expect(peaks[0]).toBeCloseTo(0.5, 5);
    expect(peaks[9]).toBeCloseTo(0.9, 5);
  });

  it("finds the tempo of a steady pulse and returns nothing for silence", () => {
    const sampleRate = 8000;
    const seconds = 30;
    const data = new Float32Array(sampleRate * seconds);
    const beat = 0.5; // 120 BPM
    for (let t = 0.25; t < seconds; t += beat) {
      const start = Math.floor(t * sampleRate);
      for (let i = 0; i < 400; i++) data[start + i] = Math.sin(i / 3) * Math.exp(-i / 120);
    }
    const info = detectBeat(data, sampleRate);
    expect(info).not.toBeNull();
    expect(info!.bpm).toBeGreaterThanOrEqual(119);
    expect(info!.bpm).toBeLessThanOrEqual(121);
    expect(Math.abs(info!.offsetMs - 250)).toBeLessThan(40);
    expect(detectBeat(new Float32Array(sampleRate * seconds), sampleRate)).toBeNull();
  });
});

describe("photo loading windows", () => {
  const clips: Clip[] = [1, 2, 3, 4].map((n) => ({
    id: `c${n}`, sourceId: `s${n}`, durationMs: 3000, motion: "none", transition: { kind: "none", durationMs: 0 }, fit: "cover", focusX: 50, focusY: 50,
  }));
  const slots = layoutClips(clips);

  it("needs the current photo now and prefetches the ones coming up", () => {
    const { now, ahead } = neededSources({ slots }, 1000);
    expect(now).toEqual(["s1"]);
    expect(ahead).toEqual(["s2"]);
    expect(neededSources({ slots }, 1000, 9000).ahead).toEqual(["s2", "s3", "s4"]);
  });

  it("holds the last photo past the end", () => {
    expect(neededSources({ slots }, 99_999).now).toEqual(["s4"]);
  });
});
