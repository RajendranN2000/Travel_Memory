import type { PageRender } from "./display-list";
import type { BookImages } from "./images";
import { ptToMm } from "./units";

/**
 * Draws a page's display list onto a canvas at a chosen resolution. Used for single-page PNG exports;
 * it reads the same drawing instructions as the PDF, so the picture matches.
 */
export async function renderPageToCanvas(render: PageRender, images: BookImages, pxPerMm: number, includeBleed: boolean): Promise<HTMLCanvasElement> {
  const view = includeBleed ? render.geometry.bleed : render.geometry.trim;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(view.w * pxPerMm));
  canvas.height = Math.max(1, Math.round(view.h * pxPerMm));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't create a drawing surface.");
  ctx.scale(pxPerMm, pxPerMm);
  ctx.translate(-view.x, -view.y);
  ctx.beginPath();
  ctx.rect(view.x, view.y, view.w, view.h);
  ctx.clip();

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    if (r > 0.01 && "roundRect" in ctx) (ctx as CanvasRenderingContext2D).roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    else ctx.rect(x, y, w, h);
  };

  for (const item of render.items) {
    ctx.save();
    switch (item.type) {
      case "rect":
        ctx.globalAlpha = item.opacity;
        roundRect(item.rect.x, item.rect.y, item.rect.w, item.rect.h, item.radiusMm);
        if (item.fill) {
          ctx.fillStyle = item.fill;
          ctx.fill();
        }
        if (item.stroke) {
          ctx.strokeStyle = item.stroke;
          ctx.lineWidth = item.strokeMm;
          ctx.stroke();
        }
        break;
      case "ellipse":
        ctx.globalAlpha = item.opacity;
        ctx.beginPath();
        ctx.ellipse(item.rect.x + item.rect.w / 2, item.rect.y + item.rect.h / 2, item.rect.w / 2, item.rect.h / 2, 0, 0, Math.PI * 2);
        if (item.fill) {
          ctx.fillStyle = item.fill;
          ctx.fill();
        }
        if (item.stroke) {
          ctx.strokeStyle = item.stroke;
          ctx.lineWidth = item.strokeMm;
          ctx.stroke();
        }
        break;
      case "line":
        ctx.globalAlpha = item.opacity;
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.strokeMm;
        ctx.beginPath();
        ctx.moveTo(item.x1, item.y1);
        ctx.lineTo(item.x2, item.y2);
        ctx.stroke();
        break;
      case "image": {
        const { canvas: img } = await images.drawable(item.sourceId, Math.ceil(item.dest.w * pxPerMm), item.filter);
        ctx.globalAlpha = item.opacity;
        roundRect(item.clip.x, item.clip.y, item.clip.w, item.clip.h, item.radiusMm);
        ctx.clip();
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, item.dest.x, item.dest.y, item.dest.w, item.dest.h);
        break;
      }
      case "text": {
        ctx.globalAlpha = item.opacity;
        ctx.fillStyle = item.color;
        ctx.font = `${item.font.italic ? "italic " : ""}${item.font.bold ? 700 : 400} ${ptToMm(item.sizePt)}px '${item.font.cssFamily}', sans-serif`;
        if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${ptToMm(item.trackingPt)}px`;
        ctx.textBaseline = "alphabetic";
        for (const seg of item.segments) ctx.fillText(seg.text, seg.x, item.y);
        break;
      }
    }
    ctx.restore();
  }
  return canvas;
}
