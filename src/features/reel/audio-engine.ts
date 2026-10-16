import { computePeaks, detectBeat, gainAt, gainBreakpoints, type BeatInfo } from "./audio-analysis";
import type { MusicSettings } from "./types";

export interface LoadedTrack {
  name: string;
  durationMs: number;
  peaks: Float32Array;
  beat: BeatInfo | null;
}

type AudioContextCtor = typeof AudioContext;

function contextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export const AUDIO_ACCEPT = "audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.flac,.opus,.weba";
const MAX_AUDIO_BYTES = 120 * 1024 * 1024;

/**
 * Plays an imported track through the Web Audio API. The same engine feeds
 * the speakers while previewing and a MediaStream while exporting, so what you
 * hear is what is recorded. Audio never leaves the browser.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private master: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private envelope: GainNode | null = null;
  private routedTo: AudioNode | null = null;

  get available(): boolean {
    return contextCtor() !== null;
  }
  get hasTrack(): boolean {
    return this.buffer !== null;
  }
  get durationMs(): number {
    return this.buffer ? Math.round(this.buffer.duration * 1000) : 0;
  }
  get context(): AudioContext | null {
    return this.ctx;
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor = contextCtor();
    if (!Ctor) throw new Error("This browser doesn't support the Web Audio API.");
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  async load(file: File): Promise<LoadedTrack> {
    if (file.size > MAX_AUDIO_BYTES) throw new Error("That audio file is larger than 120 MB. Try a shorter or compressed track.");
    const ctx = this.ensure();
    const bytes = await file.arrayBuffer();
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(bytes);
    } catch {
      throw new Error("This browser couldn't read that audio file. Try an MP3, M4A, WAV or OGG file.");
    }
    this.stop();
    this.buffer = decoded;
    return {
      name: file.name,
      durationMs: Math.round(decoded.duration * 1000),
      peaks: computePeaks(decoded.getChannelData(0), 900),
      beat: detectBeat(decoded.getChannelData(0), decoded.sampleRate),
    };
  }

  clear() {
    this.stop();
    this.buffer = null;
  }

  /** Sends audio to `node` (for recording) instead of the speakers. Pass null to restore. */
  routeTo(node: AudioNode | null) {
    if (!this.master || !this.ctx) return;
    this.master.disconnect();
    this.routedTo = node;
    this.master.connect(node ?? this.ctx.destination);
  }

  /** Starts playing at video time `tMs`. Must be called from a user gesture the first time. */
  async start(tMs: number, music: MusicSettings, totalMs: number) {
    this.stop();
    if (!this.buffer || music.muted || totalMs <= 0) return;
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
    const bufferS = this.buffer.duration;
    const trimStart = Math.min(Math.max(0, music.trimStartMs / 1000), bufferS);
    const trimEnd = Math.min(bufferS, music.trimEndMs === null ? bufferS : music.trimEndMs / 1000);
    const region = trimEnd - trimStart;
    if (region < 0.05) return;

    let offset = tMs / 1000;
    if (offset >= region) {
      if (!music.loop) return;
      offset %= region;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    if (music.loop) {
      src.loop = true;
      src.loopStart = trimStart;
      src.loopEnd = trimEnd;
    }
    const env = ctx.createGain();
    const now = ctx.currentTime;
    const points = gainBreakpoints(tMs, totalMs, music);
    env.gain.setValueAtTime(points[0]?.gain ?? gainAt(tMs, totalMs, music), now);
    for (const p of points.slice(1)) env.gain.linearRampToValueAtTime(p.gain, now + (p.atMs - tMs) / 1000);

    src.connect(env);
    env.connect(this.master!);
    if (music.loop) src.start(0, trimStart + offset);
    else src.start(0, trimStart + offset, region - offset);
    this.source = src;
    this.envelope = env;
  }

  stop() {
    try {
      this.source?.stop();
    } catch {
      // already stopped
    }
    this.source?.disconnect();
    this.envelope?.disconnect();
    this.source = null;
    this.envelope = null;
  }

  async suspend() {
    if (this.ctx?.state === "running") await this.ctx.suspend().catch(() => undefined);
  }
  async resume() {
    if (this.ctx?.state === "suspended") await this.ctx.resume().catch(() => undefined);
  }

  /** A MediaStream carrying the music, for the recorder. */
  createRecordingStream(): MediaStream | null {
    if (!this.ctx || !this.master) return null;
    const dest = this.ctx.createMediaStreamDestination();
    this.routeTo(dest);
    return dest.stream;
  }

  endRecording() {
    this.stop();
    this.routeTo(null);
  }

  dispose() {
    this.stop();
    this.buffer = null;
    this.routedTo = null;
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    void ctx?.close().catch(() => undefined);
  }
}
