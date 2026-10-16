export interface PlayerHooks {
  /** Draw the frame for time `t` (ms) */
  draw: (t: number) => void;
  totalMs: () => number;
  /** Called when playback starts or jumps while playing, e.g. to restart audio */
  onStart: (t: number) => void;
  onStop: () => void;
  /** Called about four times a second while playing */
  prefetch: (t: number) => void;
  /** Frames per second for the preview (not the export) */
  fps: () => number;
}

/**
 * Drives the preview. The playhead lives here, not in React state, so playing
 * does not re-render the editor every frame; the UI subscribes to the parts it needs.
 */
export class ReelPlayer {
  private t = 0;
  private playing = false;
  private raf = 0;
  private startedAt = 0;
  private startT = 0;
  private lastDraw = 0;
  private lastPrefetch = 0;
  private listeners = new Set<() => void>();
  private stateListeners = new Set<() => void>();

  constructor(private hooks: PlayerHooks) {}

  get time() {
    return this.t;
  }
  get isPlaying() {
    return this.playing;
  }

  setHooks(hooks: PlayerHooks) {
    this.hooks = hooks;
  }

  /** Fires on every time change. */
  subscribeTime(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
  /** Fires when playing starts or stops. */
  subscribeState(fn: () => void) {
    this.stateListeners.add(fn);
    return () => void this.stateListeners.delete(fn);
  }

  private emitTime() {
    for (const l of this.listeners) l();
  }
  private emitState() {
    for (const l of this.stateListeners) l();
  }

  play() {
    const total = this.hooks.totalMs();
    if (this.playing || total <= 0) return;
    if (this.t >= total - 30) this.t = 0;
    this.playing = true;
    this.startedAt = performance.now();
    this.startT = this.t;
    this.lastDraw = 0;
    this.hooks.onStart(this.t);
    this.emitState();
    this.raf = requestAnimationFrame(this.tick);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.hooks.onStop();
    this.emitState();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(t: number) {
    const total = this.hooks.totalMs();
    this.t = Math.min(Math.max(0, t), total);
    if (this.playing) {
      this.startedAt = performance.now();
      this.startT = this.t;
      this.hooks.onStart(this.t);
    }
    this.hooks.draw(this.t);
    this.emitTime();
  }

  /** Redraw the current frame, e.g. after an edit or when a photo finishes loading. */
  redraw() {
    this.hooks.draw(Math.min(this.t, this.hooks.totalMs()));
  }

  /** Re-sync after the project length changes. */
  clampToTotal() {
    const total = this.hooks.totalMs();
    if (this.t > total) {
      this.t = total;
      this.emitTime();
    }
    if (total <= 0 && this.playing) this.pause();
  }

  /** Restart sound and the clock from here, e.g. after the music settings change. */
  resync() {
    if (!this.playing) return;
    this.startedAt = performance.now();
    this.startT = this.t;
    this.hooks.onStart(this.t);
  }

  private tick = (now: number) => {
    if (!this.playing) return;
    const total = this.hooks.totalMs();
    const interval = 1000 / Math.max(1, this.hooks.fps());
    this.raf = requestAnimationFrame(this.tick);
    if (now - this.lastDraw < interval - 2) return;
    this.lastDraw = now;
    const t = this.startT + (now - this.startedAt);
    if (t >= total) {
      this.t = total;
      this.hooks.draw(total);
      this.emitTime();
      this.pause();
      return;
    }
    this.t = t;
    this.hooks.draw(t);
    if (now - this.lastPrefetch > 250) {
      this.lastPrefetch = now;
      this.hooks.prefetch(t);
    }
    this.emitTime();
  };

  dispose() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.listeners.clear();
    this.stateListeners.clear();
  }
}
