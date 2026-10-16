import { isHeic } from "@/features/editor/upload-validation";
import { applyFilterToPixels, isNeutral } from "./filters";
import type { PdfImageProvider } from "./pdf";
import type { BookSource, ImageFilter } from "./types";
import { newId } from "./elements";

const MAX_LOCAL_BYTES = 80 * 1024 * 1024;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** True only if the picture really has see-through pixels. A WebP or PNG photo usually does not, and is better stored as JPEG. */
function hasTransparency(bmp: ImageBitmap): boolean {
  const c = makeCanvas(48, 48);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.clearRect(0, 0, 48, 48);
  ctx.drawImage(bmp, 0, 0, 48, 48);
  const d = ctx.getImageData(0, 0, 48, 48).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

async function bitmapFrom(blob: Blob, maxWidth: number | null, srcW: number, srcH: number): Promise<ImageBitmap> {
  if (!maxWidth || maxWidth >= srcW) return createImageBitmap(blob);
  const rw = Math.max(1, Math.round(maxWidth));
  const rh = Math.max(1, Math.round((srcH * rw) / srcW));
  try {
    return await createImageBitmap(blob, { resizeWidth: rw, resizeHeight: rh, resizeQuality: "high" });
  } catch {
    const full = await createImageBitmap(blob);
    const c = makeCanvas(rw, rh);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(full, 0, 0, rw, rh);
    full.close();
    return createImageBitmap(c);
  }
}

/**
 * Photos for one book session. Bytes are fetched once; decoded bitmaps are kept only
 * in a small cache so a long book never holds every full-size photo in memory.
 */
export class BookImages implements PdfImageProvider {
  private sources = new Map<string, BookSource>();
  private blobs = new Map<string, Promise<Blob>>();
  private bitmaps = new Map<string, { bmp: ImageBitmap; width: number }>();
  private loading = new Map<string, Promise<ImageBitmap | null>>();
  private objectUrls = new Set<string>();
  private errors = new Map<string, string>();
  private previews = new Map<string, string>();
  private previewing = new Set<string>();
  private listeners = new Set<() => void>();
  private disposed = false;
  /** Changes whenever something new has finished loading, so views know to redraw */
  version = 0;

  constructor(private maxDecoded = 24) {}

  register(sources: readonly BookSource[]) {
    for (const s of sources) this.sources.set(s.id, s);
  }

  get(id: string): BookSource | undefined {
    return this.sources.get(id);
  }

  all(): BookSource[] {
    return [...this.sources.values()];
  }

  size(id: string) {
    const s = this.sources.get(id);
    return s ? { width: s.width, height: s.height } : undefined;
  }

  name(id: string) {
    return this.sources.get(id)?.name ?? "A photo";
  }

  errorFor(id: string) {
    return this.errors.get(id);
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private emit() {
    this.version += 1;
    for (const l of this.listeners) l();
  }

  revive() {
    this.disposed = false;
  }

  /** Imports a file from this device (HEIC is converted). Throws a readable message. */
  async addFile(file: File): Promise<BookSource> {
    if (file.size <= 0) throw new Error(`${file.name} is empty.`);
    if (file.size > MAX_LOCAL_BYTES) throw new Error(`${file.name} is larger than 80 MB.`);
    if (!file.type.startsWith("image/") && !isHeic(file)) throw new Error(`${file.name} isn't an image.`);
    let blob: Blob = file;
    if (isHeic(file)) {
      try {
        const { default: heic2any } = await import("heic2any");
        const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
        blob = Array.isArray(out) ? out[0] : out;
      } catch {
        blob = file; // Safari can read HEIC itself
      }
    }
    let probe: ImageBitmap;
    try {
      probe = await createImageBitmap(blob);
    } catch {
      throw new Error(`${file.name} couldn't be read. It may be damaged or in a format this browser can't open.`);
    }
    const { width, height } = probe;
    probe.close();
    const id = `local_${newId("img")}`;
    return this.addBlob(id, file.name, blob, width, height);
  }

  /** Registers bytes that are already in hand (for example restored from storage). */
  addBlob(id: string, name: string, blob: Blob, width: number, height: number): BookSource {
    const url = URL.createObjectURL(blob);
    this.objectUrls.add(url);
    this.blobs.set(id, Promise.resolve(blob));
    const source: BookSource = { id, name, url, width, height, caption: "", location: "", takenOn: null, local: true };
    this.sources.set(id, source);
    return source;
  }

  async blob(id: string): Promise<Blob> {
    const cached = this.blobs.get(id);
    if (cached) return cached;
    const source = this.sources.get(id);
    if (!source?.url) throw new Error("This photo has no image attached.");
    const url = source.url;
    const p = (async () => {
      let res: Response;
      try {
        res = await fetch(url, { mode: "cors", credentials: "omit" });
      } catch {
        throw new Error("The photo couldn't be downloaded. Check your connection, or reload to refresh its link.");
      }
      if (!res.ok) throw new Error(`The photo couldn't be loaded (${res.status}). Its link may have expired, so reload the page.`);
      return res.blob();
    })();
    this.blobs.set(id, p);
    p.catch(() => this.blobs.delete(id));
    return p;
  }

  /**
   * A small JPEG of the photo for drawing pages on screen (thumbnails and the canvas), so long books
   * don't keep full-size photos decoded. Returns null until it is ready; onChange fires when it is.
   */
  previewUrl(id: string, minWidth: number): string | null {
    const bucket = [320, 640, 1280, 2400].find((b) => b >= minWidth) ?? 2400;
    const src = this.sources.get(id);
    if (!src) return null;
    const width = Math.min(bucket, src.width);
    const key = `${id}|${width}`;
    const hit = this.previews.get(key);
    if (hit) return hit;
    // A larger one that already exists is good enough while the right size is made.
    for (const b of [2400, 1280, 640, 320]) {
      const bigger = this.previews.get(`${id}|${Math.min(b, src.width)}`);
      if (bigger && b >= bucket) return bigger;
    }
    if (!this.previewing.has(key)) {
      this.previewing.add(key);
      void (async () => {
        try {
          const blob = await this.blob(id);
          const bmp = await bitmapFrom(blob, width, src.width, src.height);
          const canvas = makeCanvas(bmp.width, bmp.height);
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(bmp, 0, 0);
          bmp.close();
          const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, /png|webp|gif/.test(blob.type) ? 'image/png' : 'image/jpeg', 0.86));
          if (out && !this.disposed) {
            const url = URL.createObjectURL(out);
            this.objectUrls.add(url);
            this.previews.set(key, url);
            this.errors.delete(id);
            this.emit();
          }
        } catch (e) {
          this.errors.set(id, e instanceof Error ? e.message : "This photo could not be loaded.");
          this.emit();
        } finally {
          this.previewing.delete(key);
        }
      })();
    }
    return null;
  }

  removeLocal(id: string) {
    const s = this.sources.get(id);
    if (s?.url && s.local) {
      URL.revokeObjectURL(s.url);
      this.objectUrls.delete(s.url);
    }
    this.bitmaps.get(id)?.bmp.close();
    this.bitmaps.delete(id);
    for (const [k, url] of this.previews) if (k.startsWith(id + "|")) { URL.revokeObjectURL(url); this.objectUrls.delete(url); this.previews.delete(k); }
    this.blobs.delete(id);
    this.sources.delete(id);
  }

  /** A decoded bitmap at least `minWidth` pixels wide, or null while it loads. Used for drawing. */
  bitmap(id: string, minWidth: number): ImageBitmap | null {
    const hit = this.bitmaps.get(id);
    const src = this.sources.get(id);
    if (hit && (hit.width >= Math.min(minWidth, src?.width ?? minWidth) * 0.9 || hit.width >= (src?.width ?? 0))) return hit.bmp;
    void this.load(id, minWidth);
    return hit?.bmp ?? null;
  }

  private load(id: string, minWidth: number): Promise<ImageBitmap | null> {
    const key = `${id}|${Math.ceil(minWidth / 128)}`;
    const existing = this.loading.get(key);
    if (existing) return existing;
    const src = this.sources.get(id);
    if (!src) return Promise.resolve(null);
    const p = (async () => {
      try {
        const blob = await this.blob(id);
        const target = Math.min(src.width, Math.max(160, minWidth));
        const bmp = await bitmapFrom(blob, target, src.width, src.height);
        if (this.disposed) {
          bmp.close();
          return null;
        }
        const old = this.bitmaps.get(id);
        this.bitmaps.set(id, { bmp, width: bmp.width });
        old?.bmp.close();
        this.errors.delete(id);
        this.evict(id);
        this.emit();
        return bmp;
      } catch (e) {
        this.errors.set(id, e instanceof Error ? e.message : "This photo couldn't be loaded.");
        this.emit();
        return null;
      } finally {
        this.loading.delete(key);
      }
    })();
    this.loading.set(key, p);
    return p;
  }

  private evict(keep: string) {
    if (this.bitmaps.size <= this.maxDecoded) return;
    for (const [id, v] of this.bitmaps) {
      if (this.bitmaps.size <= this.maxDecoded) break;
      if (id === keep) continue;
      v.bmp.close();
      this.bitmaps.delete(id);
    }
  }

  /** The photo drawn onto a canvas, scaled down only if wider than `maxWidthPx`, with its colour filter applied. */
  async drawable(id: string, maxWidthPx: number, filter: ImageFilter): Promise<{ canvas: HTMLCanvasElement; hasAlpha: boolean }> {
    const src = this.sources.get(id);
    if (!src) throw new Error("Photo not found.");
    const blob = await this.blob(id);
    const bmp = await bitmapFrom(blob, Math.min(src.width, maxWidthPx), src.width, src.height);
    try {
      const canvas = makeCanvas(bmp.width, bmp.height);
      const ctx = canvas.getContext("2d", { willReadFrequently: !isNeutral(filter) });
      if (!ctx) throw new Error("This browser couldn't prepare the photo.");
      const hasAlpha = /png|webp|gif|avif/.test(blob.type) && hasTransparency(bmp);
      if (!hasAlpha) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(bmp, 0, 0);
      if (!isNeutral(filter)) {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyFilterToPixels(data.data, filter);
        ctx.putImageData(data, 0, 0);
      }
      return { canvas, hasAlpha };
    } finally {
      bmp.close();
    }
  }

  /** PdfImageProvider: the photo, filtered and scaled only when it is larger than the print needs. */
  async render(id: string, opts: { maxWidthPx: number; filter: ImageFilter; quality: number }) {
    const { canvas, hasAlpha } = await this.drawable(id, opts.maxWidthPx, opts.filter);
    const type = hasAlpha ? "image/png" : "image/jpeg";
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, opts.quality));
    if (!out) throw new Error("This browser couldn't encode the photo.");
    const bytes = new Uint8Array(await out.arrayBuffer());
    return { bytes, format: (hasAlpha ? "png" : "jpg") as "png" | "jpg", width: canvas.width, height: canvas.height };
  }

  dispose() {
    this.disposed = true;
    for (const v of this.bitmaps.values()) v.bmp.close();
    this.bitmaps.clear();
    this.loading.clear();
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls.clear();
    this.previews.clear();
    this.blobs.clear();
    this.listeners.clear();
  }
}
