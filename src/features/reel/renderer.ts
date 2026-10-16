import { clamp } from "./config";
import { cameraAt, easeInOut, easeOut, sourceWindow } from "./motion";
import { slotsAt } from "./timeline";
import type { ClipSlot, FilterSettings, LookSettings, ReelProject, ResolvedOverlay } from "./types";

/** Everything needed to draw one frame. Preview and export build the same thing. */
export interface RenderScene {
  project: ReelProject;
  slots: ClipSlot[];
  totalMs: number;
  overlays: ResolvedOverlay[];
  /** font key -> CSS font-family */
  families: Record<string, string>;
  getImage: (sourceId: string) => ImageBitmap | null;
}

interface LayerOptions {
  alpha: number;
  dx: number;
  dy: number;
  scale: number;
  blur: number;
}

const BASE_LAYER: LayerOptions = { alpha: 1, dx: 0, dy: 0, scale: 1, blur: 0 };

/**
 * Draws reel frames onto a canvas with the 2D API. The same code runs for the
 * live preview and the exported video, so the two match.
 */
export class FrameRenderer {
  private ctx: CanvasRenderingContext2D;
  private grainTile: HTMLCanvasElement | null = null;
  private grainPattern: CanvasPattern | null = null;
  private vignetteCache: { key: string; gradient: CanvasGradient } | null = null;
  private backdrops = new WeakMap<ImageBitmap, HTMLCanvasElement>();
  private supportsFilter: boolean;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private scene: RenderScene,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Your browser couldn't create a drawing surface for the video.");
    this.ctx = ctx;
    this.supportsFilter = typeof (ctx as unknown as { filter?: unknown }).filter === "string";
  }

  setScene(scene: RenderScene) {
    this.scene = scene;
  }

  get width() {
    return this.canvas.width;
  }
  get height() {
    return this.canvas.height;
  }

  /** Draws the frame at time `tMs`. `fps` only sets the motion-blur shutter. */
  render(tMs: number, fps = 30) {
    const { ctx } = this;
    const { project, slots } = this.scene;
    const W = this.width;
    const H = this.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    const visible = slotsAt(slots, tMs);
    if (visible.length === 1) {
      this.drawClip(visible[0], tMs, fps, BASE_LAYER);
    } else if (visible.length >= 2) {
      const [a, b] = visible;
      const p = clamp((tMs - b.startMs) / Math.max(1, b.transitionInMs), 0, 1);
      this.drawTransition(a, b, p, tMs, fps);
    }

    this.applyLook(project.look, tMs);
    for (const item of this.scene.overlays) {
      if (tMs >= item.startMs && tMs <= item.endMs) this.drawText(item, tMs);
    }
    ctx.restore();
  }

  // -- clips ---------------------------------------------------------------

  private progress(slot: ClipSlot, tMs: number) {
    return clamp((tMs - slot.startMs) / Math.max(1, slot.clip.durationMs), 0, 1);
  }

  private drawClip(slot: ClipSlot, tMs: number, fps: number, layer: LayerOptions) {
    const { ctx } = this;
    const bmp = this.scene.getImage(slot.clip.sourceId);
    const W = this.width;
    const H = this.height;
    if (!bmp) {
      // Photo still loading or failed: a quiet placeholder keeps the frame steady.
      ctx.save();
      ctx.globalAlpha = layer.alpha;
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1b1b1f");
      g.addColorStop(1, "#2a2a31");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      return;
    }
    const u = this.progress(slot, tMs);
    const { motionBlur } = this.scene.project.look;
    const moving = slot.clip.motion !== "none" && this.scene.project.motionIntensity > 0;
    if (motionBlur && moving) {
      // Average a few poses inside a half-frame shutter.
      const delta = (0.5 * (1000 / fps)) / Math.max(1, slot.clip.durationMs);
      const samples = [-delta, 0, delta];
      samples.forEach((d, i) => this.drawClipPose(slot, bmp, clamp(u + d, 0, 1), { ...layer, alpha: layer.alpha / (i + 1) }));
    } else {
      this.drawClipPose(slot, bmp, u, layer);
    }
  }

  private drawClipPose(slot: ClipSlot, bmp: ImageBitmap, u: number, layer: LayerOptions) {
    const { ctx } = this;
    const { clip } = slot;
    const W = this.width;
    const H = this.height;
    const camera = cameraAt(clip.motion, u, this.scene.project.motionIntensity);

    ctx.save();
    ctx.globalAlpha = clamp(layer.alpha, 0, 1);
    if (layer.blur > 0.5 && this.supportsFilter) ctx.filter = `blur(${layer.blur.toFixed(1)}px)`;
    ctx.translate(W / 2 + layer.dx, H / 2 + layer.dy);
    ctx.scale(layer.scale, layer.scale);
    ctx.translate(-W / 2, -H / 2);

    if (clip.motion === "parallax") {
      this.drawParallax(bmp, camera.panX, u);
    } else if (clip.fit === "contain") {
      this.drawBackdrop(bmp, 1.12, 0);
      const fit = Math.min(W / bmp.width, H / bmp.height) * camera.zoom;
      const dw = bmp.width * fit;
      const dh = bmp.height * fit;
      ctx.drawImage(bmp, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      const win = sourceWindow(bmp.width, bmp.height, W, H, camera, clip.focusX, clip.focusY);
      ctx.drawImage(bmp, win.x, win.y, win.w, win.h, 0, 0, W, H);
    }
    ctx.restore();
  }

  /** A soft, blurred copy of the photo that fills the frame behind a contained image. */
  private drawBackdrop(bmp: ImageBitmap, zoom: number, shift: number) {
    const { ctx } = this;
    const W = this.width;
    const H = this.height;
    let tiny = this.backdrops.get(bmp);
    if (!tiny) {
      tiny = document.createElement("canvas");
      const scale = 28 / Math.max(bmp.width, bmp.height);
      tiny.width = Math.max(2, Math.round(bmp.width * scale));
      tiny.height = Math.max(2, Math.round(bmp.height * scale));
      const tctx = tiny.getContext("2d");
      if (tctx) {
        tctx.imageSmoothingQuality = "high";
        tctx.drawImage(bmp, 0, 0, tiny.width, tiny.height);
      }
      this.backdrops.set(bmp, tiny);
    }
    const cover = Math.max(W / tiny.width, H / tiny.height) * zoom;
    const dw = tiny.width * cover;
    const dh = tiny.height * cover;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tiny, (W - dw) / 2 + shift, (H - dh) / 2, dw, dh);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /** Two layers drifting at different speeds give the photo some depth. */
  private drawParallax(bmp: ImageBitmap, pan: number, u: number) {
    const { ctx } = this;
    const W = this.width;
    const H = this.height;
    this.drawBackdrop(bmp, 1.2, -pan * W * 0.05);
    const inset = 0.88;
    const fit = Math.min((W * inset) / bmp.width, (H * inset) / bmp.height) * (1 + 0.05 * easeInOut(u));
    const dw = bmp.width * fit;
    const dh = bmp.height * fit;
    const x = (W - dw) / 2 + pan * W * 0.025;
    const y = (H - dh) / 2;
    const radius = Math.min(W, H) * 0.02;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = Math.min(W, H) * 0.05;
    ctx.shadowOffsetY = Math.min(W, H) * 0.012;
    ctx.beginPath();
    ctx.roundRect(x, y, dw, dh, radius);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.clip();
    ctx.drawImage(bmp, x, y, dw, dh);
    ctx.restore();
  }

  // -- transitions ---------------------------------------------------------

  private drawTransition(a: ClipSlot, b: ClipSlot, rawP: number, tMs: number, fps: number) {
    const { ctx } = this;
    const W = this.width;
    const H = this.height;
    const p = easeInOut(rawP);
    const kind = b.clip.transition.kind;
    const bell = Math.sin(Math.PI * rawP);

    switch (kind) {
      case "fade": {
        if (p < 0.5) this.drawClip(a, tMs, fps, { ...BASE_LAYER, alpha: 1 - p * 2 });
        else this.drawClip(b, tMs, fps, { ...BASE_LAYER, alpha: (p - 0.5) * 2 });
        break;
      }
      case "slide-left": {
        this.drawClip(a, tMs, fps, { ...BASE_LAYER, dx: -W * 0.28 * p });
        this.drawClip(b, tMs, fps, { ...BASE_LAYER, dx: W * (1 - p) });
        this.shade(W * (1 - p) - W * 0.04, 0, W * 0.04, H, "left");
        break;
      }
      case "slide-up": {
        this.drawClip(a, tMs, fps, { ...BASE_LAYER, dy: -H * 0.28 * p });
        this.drawClip(b, tMs, fps, { ...BASE_LAYER, dy: H * (1 - p) });
        break;
      }
      case "zoom": {
        this.drawClip(b, tMs, fps, { ...BASE_LAYER, scale: 0.88 + 0.12 * p });
        this.drawClip(a, tMs, fps, { ...BASE_LAYER, alpha: 1 - p, scale: 1 + 0.3 * p });
        break;
      }
      case "blur": {
        const blur = bell * Math.min(W, H) * 0.035;
        this.drawClip(a, tMs, fps, { ...BASE_LAYER, blur, scale: 1 + 0.04 * p });
        this.drawClip(b, tMs, fps, { ...BASE_LAYER, alpha: p, blur, scale: 1.04 - 0.04 * p });
        break;
      }
      case "wipe": {
        this.drawClip(a, tMs, fps, BASE_LAYER);
        const edge = W * p;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, edge, H);
        ctx.clip();
        this.drawClip(b, tMs, fps, BASE_LAYER);
        ctx.restore();
        const g = ctx.createLinearGradient(edge - W * 0.05, 0, edge, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, "rgba(255,255,255,0.35)");
        ctx.fillStyle = g;
        ctx.fillRect(edge - W * 0.05, 0, W * 0.05, H);
        break;
      }
      case "dissolve":
      default: {
        this.drawClip(a, tMs, fps, BASE_LAYER);
        this.drawClip(b, tMs, fps, { ...BASE_LAYER, alpha: p });
      }
    }
  }

  private shade(x: number, y: number, w: number, h: number, side: "left") {
    const { ctx } = this;
    if (side !== "left") return;
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  // -- look ----------------------------------------------------------------

  private applyLook(look: LookSettings, tMs: number) {
    this.applyFilter(look.filter);
    if (look.vignette > 0) this.applyVignette(look.vignette);
    if (look.grain > 0) this.applyGrain(look.grain, tMs);
  }

  private fill(op: GlobalCompositeOperation, style: string | CanvasGradient, alpha: number) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.fillStyle = style;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  /** Colour grades are blend-mode overlays so they look the same in every browser. */
  private applyFilter({ kind, intensity }: FilterSettings) {
    if (kind === "none" || intensity <= 0) return;
    const { ctx } = this;
    const i = clamp(intensity, 0, 1);
    switch (kind) {
      case "warm":
        this.fill("soft-light", "rgb(255,150,50)", 0.75 * i);
        this.fill("overlay", "rgb(255,205,130)", 0.14 * i);
        break;
      case "cool":
        this.fill("soft-light", "rgb(50,120,255)", 0.7 * i);
        this.fill("overlay", "rgb(150,200,255)", 0.1 * i);
        break;
      case "cinematic": {
        const g = ctx.createLinearGradient(0, 0, 0, this.height);
        g.addColorStop(0, "rgb(10,95,125)");
        g.addColorStop(0.55, "rgb(120,110,100)");
        g.addColorStop(1, "rgb(255,140,50)");
        this.fill("soft-light", g, 0.85 * i);
        this.fill("saturation", "rgb(128,128,128)", 0.12 * i);
        this.fill("soft-light", "rgb(128,128,128)", 0.35 * i);
        break;
      }
      case "vintage":
        this.fill("saturation", "rgb(128,128,128)", 0.4 * i);
        this.fill("soft-light", "rgb(255,195,120)", 0.8 * i);
        this.fill("lighten", "rgb(48,34,22)", 0.4 * i);
        break;
      case "bw":
        this.fill("saturation", "rgb(128,128,128)", i);
        this.fill("soft-light", "rgb(128,128,128)", 0.3 * i);
        break;
    }
  }

  private applyVignette(amount: number) {
    const W = this.width;
    const H = this.height;
    const key = `${W}x${H}`;
    if (this.vignetteCache?.key !== key) {
      const g = this.ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.52);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,1)");
      this.vignetteCache = { key, gradient: g };
    }
    this.fill("source-over", this.vignetteCache.gradient, 0.8 * amount);
  }

  private applyGrain(amount: number, tMs: number) {
    const { ctx } = this;
    if (!this.grainPattern) {
      const tile = document.createElement("canvas");
      tile.width = 256;
      tile.height = 256;
      const tctx = tile.getContext("2d");
      if (!tctx) return;
      const img = tctx.createImageData(256, 256);
      // Fixed seed so every export has the same grain pattern.
      let seed = 1337;
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const v = (seed >>> 24) & 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      this.grainTile = tile;
      this.grainPattern = ctx.createPattern(tile, "repeat");
    }
    if (!this.grainPattern) return;
    // New grain position ~12 times a second, like film.
    const step = Math.floor(tMs / 83);
    const ox = (step * 97) % 256;
    const oy = (step * 61) % 256;
    const scale = Math.max(1, this.width / 720);
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = clamp(amount, 0, 1) * 0.35;
    ctx.translate(-ox * scale, -oy * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = this.grainPattern;
    ctx.fillRect(0, 0, this.width / scale + 256, this.height / scale + 256);
    ctx.restore();
  }

  // -- text ----------------------------------------------------------------

  private drawText(item: ResolvedOverlay, tMs: number) {
    const { ctx } = this;
    const o = item.overlay;
    if (!o.text.trim()) return;
    const W = this.width;
    const H = this.height;
    const duration = item.endMs - item.startMs;
    const local = tMs - item.startMs;
    const enter = Math.min(650, duration * 0.35);
    const exit = Math.min(500, duration * 0.3);
    const tin = enter > 0 ? clamp(local / enter, 0, 1) : 1;
    const tout = exit > 0 ? clamp((duration - local) / exit, 0, 1) : 1;
    const eIn = easeOut(tin);

    let alpha = o.animation === "none" ? 1 : eIn * easeOut(tout);
    let rise = 0;
    let scale = 1;
    let reveal = 1;
    if (o.animation === "rise") rise = (1 - eIn) * H * 0.035 - (1 - easeOut(tout)) * H * 0.01;
    if (o.animation === "zoom") scale = 0.88 + 0.12 * eIn + (1 - easeOut(tout)) * 0.04;
    if (o.animation === "typewriter") {
      reveal = clamp(local / Math.max(200, Math.min(duration * 0.5, 1800)), 0, 1);
      alpha = easeOut(tout);
    }
    if (alpha <= 0.002) return;

    const px = (o.sizePct / 100) * Math.min(W, H);
    const text = o.uppercase ? o.text.toUpperCase() : o.text;
    const family = this.scene.families[o.font] ?? "system-ui, sans-serif";

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${o.italic ? "italic " : ""}${o.weight} ${px.toFixed(1)}px ${family}`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = o.color;
    if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(o.tracking * px).toFixed(2)}px`;

    const maxW = W * 0.84;
    const lines = wrapText(ctx, text, maxW);
    const lineH = px * 1.22;
    const blockH = lineH * lines.length;
    const cx = clamp(o.x, 0.08, 0.92) * W;
    const cy = o.y * H + rise;
    const boxLeft = clamp(cx - maxW / 2, W * 0.04, W * 0.96 - maxW);

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    if (o.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = px * 0.3;
      ctx.shadowOffsetY = px * 0.06;
    }

    let remaining = Math.ceil(lines.join("").length * reveal);
    lines.forEach((line, i) => {
      const y = cy - blockH / 2 + lineH * (i + 0.5);
      const shown = o.animation === "typewriter" ? line.slice(0, Math.max(0, remaining)) : line;
      remaining -= line.length;
      if (!shown) return;
      if (o.align === "center") {
        ctx.textAlign = "center";
        ctx.fillText(shown, boxLeft + maxW / 2, y);
      } else if (o.align === "left") {
        ctx.textAlign = "left";
        ctx.fillText(shown, boxLeft, y);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(shown, boxLeft + maxW, y);
      }
    });
    ctx.restore();
  }
}

/** Breaks text into lines no wider than `maxWidth`, keeping explicit line breaks. */
export function wrapText(ctx: Pick<CanvasRenderingContext2D, "measureText">, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = `${line} ${words[i]}`;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else {
        out.push(line);
        line = words[i];
      }
    }
    out.push(line);
  }
  return out;
}
