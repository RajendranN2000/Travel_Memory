"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { coverCrop } from "../image-fit";
import type { ImageElement } from "../types";
import { clamp, type Rect } from "../units";
import type { BookStudioApi } from "./use-book-studio";

type Corner = "nw" | "ne" | "se" | "sw" | "n" | "e" | "s" | "w";

/**
 * Shows the whole original photo with the part that will be printed outlined. In Fill mode the outline
 * keeps the frame's proportions (so the photo is never stretched); in Custom crop it is free.
 */
export function CropDialog({ studio, elementId, onClose }: { studio: BookStudioApi; elementId: string | null; onClose: () => void }) {
  const page = studio.page;
  const el = page?.elements.find((e): e is ImageElement => e.id === elementId && e.type === "image") ?? null;
  const source = el?.sourceId ? studio.sourceById.get(el.sourceId) : undefined;
  return (
    <Dialog open={Boolean(el && source)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94svh] gap-3 overflow-y-auto sm:max-w-3xl">
        {el && source && page ? <CropBody key={el.id} studio={studio} pageId={page.id} el={el} width={source.width} height={source.height} sourceId={source.id} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CropBody({ studio, pageId, el, width, height, sourceId, onClose }: { studio: BookStudioApi; pageId: string; el: ImageElement; width: number; height: number; sourceId: string; onClose: () => void }) {
  const locked = el.mode !== "custom";
  const frameAspect = el.frame.w / el.frame.h;
  const src = { width, height };
  const initial: Rect = useMemo(() => (locked ? coverCrop(src, frameAspect, el.focusX, el.focusY, el.zoom) : (el.crop ?? { x: 0.1, y: 0.1, w: 0.8, h: 0.8 })), [locked, frameAspect, el.focusX, el.focusY, el.zoom, el.crop, width, height]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rect, setRect] = useState<Rect>(initial);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | Corner; start: { x: number; y: number }; rect: Rect } | null>(null);
  const url = studio.images.previewUrl(sourceId, 1280);

  useEffect(() => {
    // Nudge the preview along if it was still being generated.
    const off = studio.images.onChange(() => undefined);
    return off;
  }, [studio.images]);

  const pt = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const begin = (e: PointerEvent, mode: "move" | Corner) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { mode, start: pt(e), rect: { ...rect } };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = pt(e);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    if (d.mode === "move") {
      setRect({ ...d.rect, x: clamp(d.rect.x + dx, 0, 1 - d.rect.w), y: clamp(d.rect.y + dy, 0, 1 - d.rect.h) });
      return;
    }
    let left = d.rect.x;
    let top = d.rect.y;
    let right = d.rect.x + d.rect.w;
    let bottom = d.rect.y + d.rect.h;
    if (d.mode.includes("w")) left = clamp(left + dx, 0, right - 0.03);
    if (d.mode.includes("e")) right = clamp(right + dx, left + 0.03, 1);
    if (d.mode.includes("n")) top = clamp(top + dy, 0, bottom - 0.03);
    if (d.mode.includes("s")) bottom = clamp(bottom + dy, top + 0.03, 1);
    let next: Rect = { x: left, y: top, w: right - left, h: bottom - top };
    if (locked) {
      // Keep the frame's proportions: width leads, height follows, and anchor the opposite corner.
      const targetH = (next.w * width) / (frameAspect * height);
      const anchoredTop = d.mode.includes("s") || d.mode === "e" || d.mode === "w";
      let h = targetH;
      if (h > 1) h = 1;
      const w = (h * frameAspect * height) / width;
      const y = anchoredTop ? d.rect.y : d.rect.y + d.rect.h - h;
      const x = d.mode.includes("w") ? d.rect.x + d.rect.w - w : d.rect.x;
      next = { x: clamp(x, 0, 1 - w), y: clamp(y, 0, 1 - h), w, h };
    }
    setRect(next);
  };
  const end = () => (drag.current = null);

  const apply = () => {
    if (locked) {
      const base = coverCrop(src, frameAspect, 0.5, 0.5, 1);
      const zoom = clamp(base.w / rect.w, 1, 4);
      studio.patchElement(pageId, el.id, { focusX: clamp(rect.x + rect.w / 2, 0, 1), focusY: clamp(rect.y + rect.h / 2, 0, 1), zoom } as Partial<ImageElement>, null);
    } else {
      studio.patchElement(pageId, el.id, { crop: rect } as Partial<ImageElement>, null);
    }
    onClose();
  };

  const hidden = 1 - rect.w * rect.h;
  const handles: Corner[] = locked ? ["nw", "ne", "se", "sw"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const pos = (h: Corner) => ({ left: h.includes("w") ? "0%" : h.includes("e") ? "100%" : "50%", top: h.includes("n") ? "0%" : h.includes("s") ? "100%" : "50%" });
  const cursors: Record<Corner, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{locked ? "Adjust the crop" : "Custom crop"}</DialogTitle>
        <DialogDescription>
          {locked ? "Drag the outline to choose what shows in the frame. It keeps the frame's shape, so the photo is never stretched." : "Drag the outline and its handles to pick the part of the photo to show. The photo keeps its own proportions."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid place-items-center rounded-lg bg-muted p-3">
        <div ref={box} className="relative max-h-[58svh] max-w-full touch-none select-none" style={{ aspectRatio: width / height, width: `min(100%, ${58 * (width / height)}svh)` }}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated object URL
            <img src={url} alt="The whole original photo" draggable={false} className="absolute inset-0 h-full w-full" />
          ) : (
            <div className="absolute inset-0 animate-pulse bg-muted-foreground/20" />
          )}
          <div
            onPointerDown={(e) => begin(e, "move")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute cursor-move border-2 border-white"
            style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
          >
            {handles.map((h) => (
              <span key={h} onPointerDown={(e) => begin(e, h)} onPointerMove={move} onPointerUp={end} className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-primary bg-white" style={{ ...pos(h), cursor: cursors[h] }} />
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        About <strong className="text-foreground">{Math.round(hidden * 100)}%</strong> of the photo is hidden by this crop. The original photo is never changed.
      </p>
      <DialogFooter className="gap-2 sm:justify-between">
        <Button variant="ghost" onClick={() => setRect(locked ? coverCrop(src, frameAspect, 0.5, 0.5, 1) : { x: 0, y: 0, w: 1, h: 1 })}>
          {locked ? "Reset to centred" : "Reset to the whole photo"}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={apply}>Apply crop</Button>
        </div>
      </DialogFooter>
    </>
  );
}
