import { isHeic } from "@/features/editor/upload-validation";
import { newId } from "./timeline";
import type { ReelSource } from "./types";

const MAX_LOCAL_BYTES = 60 * 1024 * 1024;
const THUMB_EDGE = 320;

export interface DecodeTarget {
  frameW: number;
  frameH: number;
}

/** How far a photo may be zoomed before it would need more detail than we decode. */
const DETAIL_ZOOM = 1.45;

/** Pixel size to decode a photo at so a cover-fit frame stays sharp at up to ~1.45x zoom, never upscaling. */
export function decodeScale(srcW: number, srcH: number, frameW: number, frameH: number): number {
  const frameAspect = frameW / frameH;
  const k = srcW / srcH > frameAspect ? srcH / frameH : srcW / frameW; // source pixels per frame pixel
  return Math.min(1, DETAIL_ZOOM / Math.max(k, 1e-6));
}

function fail(name: string): never {
  throw new Error(`${name} couldn't be decoded. It may be damaged or in a format this browser can't read.`);
}

async function bitmapAt(blob: Blob, w: number, h: number, scale: number, name: string): Promise<ImageBitmap> {
  if (scale >= 0.999) {
    try {
      return await createImageBitmap(blob);
    } catch {
      return fail(name);
    }
  }
  const rw = Math.max(1, Math.round(w * scale));
  const rh = Math.max(1, Math.round(h * scale));
  try {
    return await createImageBitmap(blob, { resizeWidth: rw, resizeHeight: rh, resizeQuality: "high" });
  } catch {
    // Some browsers ignore or reject resize options: decode, then scale through a canvas.
    try {
      const full = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = rw;
      canvas.height = rh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(full, 0, 0, rw, rh);
      full.close();
      return await createImageBitmap(canvas);
    } catch {
      return fail(name);
    }
  }
}

/**
 * Holds the photos for one editing session: fetches the bytes, decodes them at
 * the size needed for the current frame and keeps only a few decoded at once.
 * Everything stays in this tab's memory.
 */
export class MediaLibrary {
  private sources = new Map<string, ReelSource>();
  private blobs = new Map<string, Promise<Blob>>();
  private bitmaps = new Map<string, ImageBitmap>();
  private loading = new Map<string, Promise<ImageBitmap | null>>();
  private thumbs = new Map<string, string>();
  private objectUrls = new Set<string>();
  private frame: DecodeTarget = { frameW: 540, frameH: 960 };
  private errors = new Map<string, string>();
  private disposed = false;

  constructor(private maxDecoded = 6) {}

  register(sources: readonly ReelSource[]) {
    for (const s of sources) this.sources.set(s.id, s);
  }

  getSource(id: string): ReelSource | undefined {
    return this.sources.get(id);
  }

  setMaxDecoded(n: number) {
    this.maxDecoded = n;
  }

  /** Tells the library the frame size; decoded images that no longer fit are dropped. */
  setFrame(frameW: number, frameH: number) {
    if (this.frame.frameW === frameW && this.frame.frameH === frameH) return;
    this.frame = { frameW, frameH };
    this.dropAll();
  }

  private dropAll() {
    for (const b of this.bitmaps.values()) b.close();
    this.bitmaps.clear();
    this.loading.clear();
  }

  errorFor(id: string): string | undefined {
    return this.errors.get(id);
  }

  /** A small image for lists. Remote photos reuse their own URL; local ones get a thumbnail. */
  thumb(id: string): string | null {
    return this.thumbs.get(id) ?? this.sources.get(id)?.url ?? null;
  }

  /** Imports a file from this device. Throws a readable message if it can't be used. */
  async addFile(file: File): Promise<ReelSource> {
    if (file.size <= 0) throw new Error(`${file.name} is empty.`);
    if (file.size > MAX_LOCAL_BYTES) throw new Error(`${file.name} is larger than 60 MB.`);
    const looksLikeImage = file.type.startsWith("image/") || isHeic(file);
    if (!looksLikeImage) throw new Error(`${file.name} isn't an image.`);

    let blob: Blob = file;
    if (isHeic(file)) {
      try {
        const { default: heic2any } = await import("heic2any");
        const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        blob = Array.isArray(out) ? out[0] : out;
      } catch {
        // Safari can decode HEIC itself; fall through with the original file.
        blob = file;
      }
    }

    let probe: ImageBitmap;
    try {
      probe = await createImageBitmap(blob);
    } catch {
      return fail(file.name);
    }
    const { width, height } = probe;
    probe.close();

    const id = `local_${newId("img")}`;
    const url = URL.createObjectURL(blob);
    this.objectUrls.add(url);
    this.blobs.set(id, Promise.resolve(blob));
    const source: ReelSource = {
      id,
      name: file.name,
      url,
      width,
      height,
      caption: "",
      location: "",
      local: true,
      focusX: 50,
      focusY: 50,
    };
    this.sources.set(id, source);
    void this.makeThumb(id, blob, width, height);
    return source;
  }

  private async makeThumb(id: string, blob: Blob, w: number, h: number) {
    try {
      const scale = Math.min(1, THUMB_EDGE / Math.max(w, h));
      const bmp = await bitmapAt(blob, w, h, scale, id);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext("2d")?.drawImage(bmp, 0, 0);
      bmp.close();
      const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
      if (out && !this.disposed) {
        const url = URL.createObjectURL(out);
        this.objectUrls.add(url);
        this.thumbs.set(id, url);
      }
    } catch {
      // The full image URL still works as a fallback.
    }
  }

  removeLocal(id: string) {
    const s = this.sources.get(id);
    if (!s?.local) return;
    this.bitmaps.get(id)?.close();
    this.bitmaps.delete(id);
    for (const url of [s.url, this.thumbs.get(id)]) {
      if (url) {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(url);
      }
    }
    this.thumbs.delete(id);
    this.blobs.delete(id);
    this.sources.delete(id);
  }

  private blob(id: string): Promise<Blob> {
    const cached = this.blobs.get(id);
    if (cached) return cached;
    const source = this.sources.get(id);
    if (!source?.url) return Promise.reject(new Error("This photo has no image attached."));
    const url = source.url;
    const promise = (async () => {
      let res: Response;
      try {
        res = await fetch(url, { mode: "cors", credentials: "omit" });
      } catch {
        throw new Error(`${source.name || "A photo"} couldn't be loaded. Check your connection, or reload to refresh the photo links.`);
      }
      if (!res.ok) {
        throw new Error(`${source.name || "A photo"} couldn't be loaded (${res.status}). Its link may have expired, so reload the page.`);
      }
      return res.blob();
    })();
    this.blobs.set(id, promise);
    promise.catch(() => this.blobs.delete(id));
    return promise;
  }

  /** The decoded image, if it is ready. The renderer calls this every frame. */
  get(id: string): ImageBitmap | null {
    return this.bitmaps.get(id) ?? null;
  }

  has(id: string): boolean {
    return this.bitmaps.has(id);
  }

  private load(id: string): Promise<ImageBitmap | null> {
    const existing = this.loading.get(id);
    if (existing) return existing;
    const source = this.sources.get(id);
    if (!source) return Promise.resolve(null);
    const frameAtStart = this.frame;
    const p = (async () => {
      try {
        const blob = await this.blob(id);
        const scale = decodeScale(source.width, source.height, frameAtStart.frameW, frameAtStart.frameH);
        const bmp = await bitmapAt(blob, source.width, source.height, scale, source.name || "A photo");
        if (this.disposed || frameAtStart !== this.frame) {
          bmp.close();
          return null;
        }
        this.bitmaps.set(id, bmp);
        this.errors.delete(id);
        return bmp;
      } catch (e) {
        this.errors.set(id, e instanceof Error ? e.message : "This photo couldn't be loaded.");
        return null;
      } finally {
        this.loading.delete(id);
      }
    })();
    this.loading.set(id, p);
    return p;
  }

  /**
   * Decodes `needed` (and, without waiting, `ahead`), then drops other decoded images
   * beyond the memory budget. Resolves once everything in `needed` has settled.
   */
  async ensure(needed: readonly string[], ahead: readonly string[] = []): Promise<void> {
    const keep = new Set([...needed, ...ahead]);
    for (const id of ahead) void this.load(id);
    await Promise.all(needed.map((id) => (this.bitmaps.has(id) ? null : this.load(id))));
    this.evict(keep);
  }

  private evict(keep: ReadonlySet<string>) {
    if (this.bitmaps.size <= Math.max(this.maxDecoded, keep.size)) return;
    for (const [id, bmp] of this.bitmaps) {
      if (this.bitmaps.size <= Math.max(this.maxDecoded, keep.size)) break;
      if (keep.has(id)) continue;
      bmp.close();
      this.bitmaps.delete(id);
    }
  }

  /** Fetches the photo bytes in the background so the first play is quick. */
  warm(ids: readonly string[]) {
    for (const id of ids) void this.blob(id).catch(() => undefined);
  }

  /** Allows reuse after dispose(), e.g. when React re-mounts the editor in development. */
  revive() {
    this.disposed = false;
  }

  dispose() {
    this.disposed = true;
    this.dropAll();
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls.clear();
    this.thumbs.clear();
    this.blobs.clear();
    this.sources.clear();
  }
}
