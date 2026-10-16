import type { AudioEngine } from "./audio-engine";
import type { FormatOption } from "./capabilities";
import { outputSize, videoBitrate } from "./config";
import { familyMap, fontsUsed, loadProjectFonts } from "./fonts";
import type { MediaLibrary } from "./media-library";
import { FrameRenderer } from "./renderer";
import { buildScene, neededSources } from "./scene";
import type { ReelProject } from "./types";

export type ExportPhase = "preparing" | "rendering" | "paused" | "finalizing";

export interface ExportProgress {
  phase: ExportPhase;
  /** 0-1 */
  fraction: number;
  elapsedMs: number;
  totalMs: number;
  /** Frames drawn per second so far */
  measuredFps: number;
  message?: string;
}

export interface ExportResult {
  blob: Blob;
  format: FormatOption["format"];
  mime: string;
  width: number;
  height: number;
  durationMs: number;
  measuredFps: number;
}

export class ExportCancelled extends Error {
  constructor() {
    super("Export cancelled.");
    this.name = "ExportCancelled";
  }
}

export interface ExportArgs {
  project: ReelProject;
  library: MediaLibrary;
  audio: AudioEngine;
  format: FormatOption;
  signal: AbortSignal;
  onProgress: (p: ExportProgress) => void;
}

const raf = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createRecorder(stream: MediaStream, mimeType: string, videoBitsPerSecond: number): MediaRecorder {
  try {
    return new MediaRecorder(stream, { mimeType, videoBitsPerSecond, audioBitsPerSecond: 192_000 });
  } catch {
    return new MediaRecorder(stream, { mimeType });
  }
}

/**
 * Renders the reel to a video file in this browser. The canvas is drawn in real
 * time and recorded with MediaRecorder together with the Web Audio mix. Nothing is uploaded.
 */
export async function exportReel(args: ExportArgs): Promise<ExportResult> {
  const { project, library, audio, format, signal, onProgress } = args;
  const { width, height } = outputSize(project.aspect, project.resolution);
  const fps = project.fps;
  const interval = 1000 / fps;

  const families = familyMap(fontsUsed(project));
  const scene = buildScene(project, (id) => library.get(id), families);
  const total = scene.totalMs;
  if (total <= 0) throw new Error("Add at least one photo to the timeline before exporting.");

  const report = (p: Partial<ExportProgress> & Pick<ExportProgress, "phase">) =>
    onProgress({ fraction: 0, elapsedMs: 0, totalMs: total, measuredFps: 0, ...p });
  const throwIfCancelled = () => {
    if (signal.aborted) throw new ExportCancelled();
  };

  report({ phase: "preparing", message: "Loading fonts and photos" });
  await loadProjectFonts(project);
  library.setMaxDecoded(5);
  library.setFrame(width, height);
  const first = neededSources(scene, 0);
  await library.ensure(first.now, first.ahead);
  throwIfCancelled();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  Object.assign(canvas.style, { position: "fixed", left: "-10000px", top: "0", width: "2px", height: "2px", pointerEvents: "none" });
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  let wakeLock: { release: () => Promise<void> } | null = null;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let onVisibility: (() => void) | null = null;
  let usedAudio = false;

  try {
    const renderer = new FrameRenderer(canvas, scene);
    renderer.render(0, fps);

    // Ask for frames on demand where supported; otherwise let the browser sample the canvas at the target rate.
    stream = canvas.captureStream(0);
    let videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    const manual = typeof videoTrack?.requestFrame === "function";
    if (!manual) {
      stream.getTracks().forEach((t) => t.stop());
      stream = canvas.captureStream(fps);
      videoTrack = undefined;
    }
    const pushFrame = () => {
      if (manual) videoTrack?.requestFrame();
    };

    if (audio.hasTrack && !project.music.muted && audio.available) {
      const audioStream = audio.createRecordingStream();
      if (audioStream) {
        for (const t of audioStream.getAudioTracks()) stream.addTrack(t);
        usedAudio = true;
      }
    }

    recorder = createRecorder(stream, format.mime, videoBitrate(width, height, fps));
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const stopped = new Promise<void>((resolve, reject) => {
      recorder!.onstop = () => resolve();
      recorder!.onerror = (e) => reject(new Error((e as unknown as { error?: Error }).error?.message ?? "The browser's video recorder stopped unexpectedly."));
    });
    stopped.catch(() => undefined);

    try {
      wakeLock = (await (navigator as unknown as { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock?.request("screen")) ?? null;
    } catch {
      wakeLock = null;
    }

    throwIfCancelled();
    recorder.start(1000);
    pushFrame();
    if (usedAudio) await audio.start(0, project.music, total);

    // Wall-clock bookkeeping that ignores time spent paused (hidden tab, waiting for photos).
    const clockStart = performance.now();
    let pausedMs = 0;
    let frames = 0;
    let lastRender = 0;
    let lastAhead = 0;
    let paused = false;
    let pauseStarted = 0;

    const pause = (message: string) => {
      if (paused) return;
      paused = true;
      pauseStarted = performance.now();
      if (recorder?.state === "recording") recorder.pause();
      if (usedAudio) void audio.suspend();
      report({ phase: "paused", fraction: Math.min(1, (pauseStarted - clockStart - pausedMs) / total), message, totalMs: total });
    };
    // Time spent paused is not counted, so the video has no gap or jump.
    const resume = () => {
      if (!paused) return;
      pausedMs += performance.now() - pauseStarted;
      paused = false;
      if (recorder?.state === "paused") recorder.resume();
      if (usedAudio) void audio.resume();
    };

    const hidden = () => document.visibilityState === "hidden";
    onVisibility = () => {
      if (hidden()) pause("Paused while this tab is in the background. Switch back to continue.");
      else resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    if (hidden()) onVisibility();

    for (;;) {
      throwIfCancelled();
      if (paused) {
        await sleep(120);
        continue;
      }

      const now = await raf();
      const t = Math.min(total, now - clockStart - pausedMs);
      if (t >= total) break;
      if (now - lastRender < interval - 2) continue;

      // Make sure the photos for this moment are decoded; if not, freeze the clock until they are.
      const { now: needNow, ahead } = neededSources(scene, t);
      if (needNow.some((id) => !library.has(id))) {
        pause("Loading photos");
        await library.ensure(needNow, ahead);
        const failed = needNow.find((id) => library.errorFor(id));
        if (failed) throw new Error(library.errorFor(failed));
        throwIfCancelled();
        if (!hidden()) resume();
        continue;
      }
      if (now - lastAhead > 400) {
        lastAhead = now;
        void library.ensure([], [...needNow, ...ahead]);
      }

      lastRender = now;
      renderer.render(t, fps);
      pushFrame();
      frames += 1;
      const elapsed = Math.max(1, now - clockStart - pausedMs);
      report({ phase: "rendering", fraction: Math.min(1, t / total), elapsedMs: t, totalMs: total, measuredFps: (frames / elapsed) * 1000 });
    }

    // Final frame, held briefly so the recorder keeps the last moment.
    renderer.render(total, fps);
    pushFrame();
    report({ phase: "finalizing", fraction: 1, elapsedMs: total, totalMs: total, measuredFps: (frames / Math.max(1, total)) * 1000, message: "Finishing the file" });
    await sleep(Math.max(200, interval * 3));
    const measuredFps = (frames / Math.max(1, performance.now() - clockStart - pausedMs)) * 1000;
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    throwIfCancelled();

    const blob = new Blob(chunks, { type: format.mime.split(";")[0] });
    if (blob.size < 1024) throw new Error("The browser produced an empty video. Try again, or choose another format or resolution.");
    return { blob, format: format.format, mime: blob.type, width, height, durationMs: total, measuredFps };
  } catch (error) {
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      try {
        recorder.stop();
      } catch {
        // already stopped
      }
    }
    if (signal.aborted) throw new ExportCancelled();
    throw error;
  } finally {
    if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
    audio.endRecording();
    stream?.getTracks().forEach((t) => t.stop());
    canvas.remove();
    canvas.width = 0;
    canvas.height = 0;
    void wakeLock?.release().catch(() => undefined);
  }
}
