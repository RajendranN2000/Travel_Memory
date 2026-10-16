import type { FpsOption } from "./types";

export type ExportFormat = "mp4" | "webm";

export interface FormatOption {
  format: ExportFormat;
  /** MIME type passed to MediaRecorder */
  mime: string;
  label: string;
}

export interface BrowserEnv {
  hasMediaRecorder: boolean;
  isTypeSupported: (mime: string) => boolean;
  canCaptureCanvas: boolean;
  hasAudioContext: boolean;
}

export interface ExportCapabilities {
  /** The browser can record a canvas at all */
  canExport: boolean;
  formats: FormatOption[];
  /** Best format available; MP4 first */
  preferred: FormatOption | null;
  canMixAudio: boolean;
  /** Plain-English limitations to show before rendering */
  notes: string[];
  /** Why exporting is impossible, when it is */
  blocker: string | null;
}

const MP4_CANDIDATES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=avc1.4d002a,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
];
const WEBM_CANDIDATES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

function firstSupported(env: BrowserEnv, candidates: string[]): string | null {
  for (const mime of candidates) {
    try {
      if (env.isTypeSupported(mime)) return mime;
    } catch {
      // some browsers throw on unknown parameters
    }
  }
  return null;
}

/**
 * Works out what this browser can really produce. MP4 is only offered when
 * MediaRecorder reports that it can write it; WebM is never renamed to MP4.
 */
export function detectCapabilities(env: BrowserEnv): ExportCapabilities {
  const notes: string[] = [];
  if (!env.hasMediaRecorder || !env.canCaptureCanvas) {
    return {
      canExport: false,
      formats: [],
      preferred: null,
      canMixAudio: false,
      notes,
      blocker:
        "This browser cannot record video from a canvas, so reels can't be exported here. Try a current version of Chrome, Edge, Safari or Firefox.",
    };
  }
  const formats: FormatOption[] = [];
  const mp4 = firstSupported(env, MP4_CANDIDATES);
  const webm = firstSupported(env, WEBM_CANDIDATES);
  if (mp4) formats.push({ format: "mp4", mime: mp4, label: "MP4 (H.264)" });
  if (webm) formats.push({ format: "webm", mime: webm, label: "WebM" });

  if (!formats.length) {
    return {
      canExport: false,
      formats,
      preferred: null,
      canMixAudio: false,
      notes,
      blocker: "This browser can't encode MP4 or WebM video. Try a current version of Chrome, Edge or Safari.",
    };
  }
  if (!mp4) notes.push("This browser can only save WebM. Most players handle it, but Instagram and some phones prefer MP4, so convert the file first if an upload fails.");
  if (!env.hasAudioContext) notes.push("Audio mixing isn't available in this browser, so the video will be silent.");
  notes.push("Rendering runs in real time: a 30 second reel takes about 30 seconds. Keep this tab open and visible while it renders.");

  return { canExport: true, formats, preferred: formats[0], canMixAudio: env.hasAudioContext, notes, blocker: null };
}

/** Reads the real browser. Safe on the server: it reports no support. */
export function detectBrowserEnv(): BrowserEnv {
  if (typeof window === "undefined") {
    return { hasMediaRecorder: false, isTypeSupported: () => false, canCaptureCanvas: false, hasAudioContext: false };
  }
  const w = window as unknown as {
    MediaRecorder?: { isTypeSupported(mime: string): boolean };
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
  };
  return {
    hasMediaRecorder: Boolean(w.MediaRecorder),
    isTypeSupported: (mime) => Boolean(w.MediaRecorder?.isTypeSupported?.(mime)),
    canCaptureCanvas: typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype,
    hasAudioContext: Boolean(w.AudioContext ?? w.webkitAudioContext),
  };
}

/** 60 fps is heavy: warn rather than block. */
export function fpsWarning(fps: FpsOption, width: number, height: number): string | null {
  if (fps === 60 && width * height > 1280 * 720) {
    return "60 fps at this size is demanding. Slower devices may drop frames; 30 fps is smoother on most phones and laptops.";
  }
  return null;
}
