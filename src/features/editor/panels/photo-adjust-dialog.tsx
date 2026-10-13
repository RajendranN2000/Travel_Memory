"use client";

import { Move, RotateCcw } from "lucide-react";
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FRAME_SHAPES, type FrameShape, type PhotoFrame } from "@/features/memories/types";
import { frameStyle, imageFrameStyle } from "@/features/templates/components/shared";
import type { EditorPhoto } from "@/features/trips/types";

const SHAPE_LABEL: Record<FrameShape, string> = {
  auto: "Template default",
  landscape: "Wide",
  square: "Square",
  portrait: "Tall",
  original: "Original",
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Lets the user crop and size one photo: drag the picture to choose what stays
 * in view, zoom in, pick the frame's shape, or show the whole photo uncropped.
 * Every change is applied immediately and saved with the other edits.
 */
export function PhotoAdjustDialog({
  photo,
  index,
  open,
  onOpenChange,
  onChange,
}: {
  photo: EditorPhoto;
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (frame: PhotoFrame) => void;
}) {
  const frame = photo.frame;
  const x = frame.x ?? 50;
  const y = frame.y ?? 50;
  const zoom = frame.zoom ?? 1;
  const shape = frame.shape ?? "auto";
  const fit = frame.fit ?? "cover";
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const update = (patch: PhotoFrame) => onChange({ ...frame, ...patch });
  const move = (nx: number, ny: number) => update({ x: Math.round(clamp(nx, 0, 100)), y: Math.round(clamp(ny, 0, 100)) });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x, y };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    const rect = box.current?.getBoundingClientRect();
    if (!start || !rect) return;
    // Dragging the picture right reveals more of its left side, so the focus moves the other way.
    move(start.x - ((e.clientX - start.px) / rect.width) * 100, start.y - ((e.clientY - start.py) / rect.height) * 100);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    move(x + d[0], y + d[1]);
  };

  const pristine = x === 50 && y === 50 && zoom === 1 && shape === "auto" && fit === "cover";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Crop &amp; size photo {index + 1}</DialogTitle>
          <DialogDescription>Drag the photo to choose what stays in view. Templates use this framing everywhere the photo appears.</DialogDescription>
        </DialogHeader>

        <div
          ref={box}
          role="group"
          tabIndex={0}
          aria-label="Photo frame. Drag, or use the arrow keys, to move the photo inside the frame."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          style={frameStyle({ ...photoFor(photo), frame: { shape } }) ?? { aspectRatio: "3 / 2" }}
          className={cn(
            "relative mx-auto max-h-[45svh] w-full touch-none overflow-hidden rounded-lg bg-muted outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
            fit === "cover" ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
        >
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed or local preview URL
            <img
              src={photo.url}
              alt=""
              draggable={false}
              style={imageFrameStyle(photoFor(photo, frame))}
              className={cn("absolute inset-0 h-full w-full", fit === "cover" ? "object-cover" : "object-contain")}
            />
          ) : (
            <span className="grid h-full place-items-center text-sm text-muted-foreground">Preview unavailable</span>
          )}
          {fit === "cover" ? (
            <span className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/65 px-2 py-1 text-xs text-white">
              <Move aria-hidden className="size-3" /> Drag to reposition
            </span>
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Frame shape</legend>
          <div className="flex flex-wrap gap-2">
            {FRAME_SHAPES.map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={shape === value ? "default" : "outline"}
                aria-pressed={shape === value}
                onClick={() => update({ shape: value })}
              >
                {SHAPE_LABEL[value]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Some layouts (like the mosaic) use a fixed grid, where only zoom, position and fit apply.
          </p>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Fit</legend>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={fit === "cover" ? "default" : "outline"} aria-pressed={fit === "cover"} onClick={() => update({ fit: "cover" })}>
              Fill the frame
            </Button>
            <Button
              type="button"
              size="sm"
              variant={fit === "contain" ? "default" : "outline"}
              aria-pressed={fit === "contain"}
              onClick={() => update({ fit: "contain" })}
            >
              Show whole photo
            </Button>
          </div>
        </fieldset>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor={`zoom-${photo.id}`} className="text-sm font-semibold">
              Zoom
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">{zoom.toFixed(2).replace(/\.?0+$/, "")}×</span>
          </div>
          <input
            id={`zoom-${photo.id}`}
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            disabled={fit === "contain"}
            onChange={(e) => update({ zoom: Number(e.target.value) })}
            className="h-11 w-full accent-[var(--brand,currentColor)] disabled:opacity-50"
          />
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button type="button" variant="ghost" disabled={pristine} onClick={() => onChange({})}>
            <RotateCcw data-icon="inline-start" /> Reset
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Adapts an editor photo to the shape the template helpers expect. */
function photoFor(photo: EditorPhoto, frame: PhotoFrame = {}) {
  return { id: photo.id, src: photo.url, width: photo.width, height: photo.height, caption: photo.caption, location: photo.location, takenOn: photo.takenOn, frame };
}
