"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Blend, Copy, Film, Maximize2, Music2, Plus, Trash2, Type, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { resolveOverlays } from "../timeline";
import { formatDuration, formatTimecode } from "../config";
import { TRANSITION_LABELS } from "../presets";
import type { ClipSlot, ResolvedOverlay } from "../types";
import { cn } from "@/lib/utils";
import type { ReelStudioApi } from "./use-reel-studio";

const MIN_PPS = 14;
const MAX_PPS = 260;

function tickStep(pps: number): number {
  if (pps >= 120) return 1000;
  if (pps >= 50) return 2000;
  if (pps >= 28) return 5000;
  return 10_000;
}

// -- clips ---------------------------------------------------------------------

function ClipBlock({
  studio,
  slot,
  widthMs,
  pps,
  selected,
}: {
  studio: ReelStudioApi;
  slot: ClipSlot;
  widthMs: number;
  pps: number;
  selected: boolean;
}) {
  const { clip } = slot;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id });
  const thumb = studio.library.thumb(clip.sourceId);
  const resize = useRef<{ x: number; dur: number } | null>(null);
  const label = `Clip ${slot.index + 1}, ${(clip.durationMs / 1000).toFixed(1)} seconds`;

  const onHandleDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resize.current = { x: e.clientX, dur: clip.durationMs };
    studio.setSelection({ type: "clip", id: clip.id });
  };
  const onHandleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!resize.current) return;
    const next = resize.current.dur + ((e.clientX - resize.current.x) / pps) * 1000;
    studio.setDuration(clip.id, Math.round(next / 100) * 100);
  };
  const onHandleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 1000 : 100;
    if (e.key === "ArrowRight") studio.setDuration(clip.id, clip.durationMs + step);
    else if (e.key === "ArrowLeft") studio.setDuration(clip.id, clip.durationMs - step);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={{ width: Math.max(22, (widthMs / 1000) * pps), transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className="relative h-full shrink-0 py-1"
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`${label}${selected ? ", selected" : ""}`}
        aria-pressed={selected}
        onClick={() => studio.setSelection({ type: "clip", id: clip.id })}
        onFocus={() => studio.setSelection({ type: "clip", id: clip.id })}
        className={cn(
          "relative h-full cursor-grab touch-none overflow-hidden rounded-md border bg-muted outline-none active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/60",
          selected ? "border-primary ring-2 ring-primary/70" : "border-white/10",
          isDragging && "opacity-80 shadow-xl",
        )}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- local or signed URLs
          <img src={thumb} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-85" />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-0.5 text-[0.65rem] leading-tight text-white">
          {slot.index + 1} · {(clip.durationMs / 1000).toFixed(1)}s
        </div>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Length of clip ${slot.index + 1}`}
        aria-valuemin={800}
        aria-valuemax={15000}
        aria-valuenow={clip.durationMs}
        aria-valuetext={`${(clip.durationMs / 1000).toFixed(1)} seconds`}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={() => (resize.current = null)}
        onPointerCancel={() => (resize.current = null)}
        onKeyDown={onHandleKey}
        className="absolute top-1 right-0 bottom-1 z-10 flex w-3 cursor-ew-resize touch-none items-center justify-center rounded-r-md bg-primary/0 outline-none hover:bg-primary/60 focus-visible:bg-primary/70"
      >
        <span aria-hidden className="h-4 w-0.5 rounded bg-white/70" />
      </div>
      {slot.index > 0 && slot.transitionInMs > 0 ? (
        <button
          type="button"
          aria-label={`Transition into clip ${slot.index + 1}: ${TRANSITION_LABELS[clip.transition.kind]}`}
          title={TRANSITION_LABELS[clip.transition.kind]}
          onClick={() => studio.setSelection({ type: "clip", id: clip.id })}
          className="absolute top-1/2 -left-2.5 z-10 grid size-5 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/80 text-white outline-none hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/70"
        >
          <Blend className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

// -- text -----------------------------------------------------------------------

function layoutLanes(items: ResolvedOverlay[]): { item: ResolvedOverlay; lane: number }[] {
  const ends: number[] = [];
  return [...items]
    .sort((a, b) => a.startMs - b.startMs)
    .map((item) => {
      let lane = ends.findIndex((end) => end <= item.startMs);
      if (lane < 0) lane = ends.length;
      ends[lane] = item.endMs;
      return { item, lane };
    });
}

function TextBlock({ studio, item, lane, pps, selected }: { studio: ReelStudioApi; item: ResolvedOverlay; lane: number; pps: number; selected: boolean }) {
  const drag = useRef<{ x: number; start: number; mode: "move" | "resize"; moved: boolean } | null>(null);
  const o = item.overlay;
  const duration = item.endMs - item.startMs;

  const beginDrag = (mode: "move" | "resize", e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, start: mode === "move" ? item.startMs : duration, mode, moved: false };
    studio.setSelection({ type: "text", id: o.id });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const delta = ((e.clientX - d.x) / pps) * 1000;
    if (Math.abs(e.clientX - d.x) > 3) d.moved = true;
    if (!d.moved) return;
    if (d.mode === "move") studio.moveOverlay(o.id, Math.round((d.start + delta) / 100) * 100, duration);
    else studio.moveOverlay(o.id, item.startMs, Math.round((d.start + delta) / 100) * 100);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 1000 : 100;
    if (e.key === "ArrowRight" && e.altKey) studio.moveOverlay(o.id, item.startMs, duration + step);
    else if (e.key === "ArrowLeft" && e.altKey) studio.moveOverlay(o.id, item.startMs, duration - step);
    else if (e.key === "ArrowRight") studio.moveOverlay(o.id, item.startMs + step, duration);
    else if (e.key === "ArrowLeft") studio.moveOverlay(o.id, item.startMs - step, duration);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Text: ${o.text || "empty"}, from ${(item.startMs / 1000).toFixed(1)} seconds for ${(duration / 1000).toFixed(1)} seconds. Arrow keys move it; Alt plus arrows change its length.`}
      aria-pressed={selected}
      onPointerDown={(e) => beginDrag("move", e)}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={key}
      onFocus={() => studio.setSelection({ type: "text", id: o.id })}
      style={{ left: (item.startMs / 1000) * pps, width: Math.max(18, (duration / 1000) * pps), top: lane * 26 + 4 }}
      className={cn(
        "absolute flex h-6 cursor-grab touch-none items-center overflow-hidden rounded border px-1.5 text-[0.7rem] outline-none focus-visible:ring-3 focus-visible:ring-ring/60 active:cursor-grabbing",
        selected ? "border-primary bg-primary/30 text-foreground" : "border-white/15 bg-white/10 text-foreground/80 hover:bg-white/15",
      )}
    >
      <span className="truncate">{o.text || "(empty)"}</span>
      <div
        onPointerDown={(e) => beginDrag("resize", e)}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        aria-hidden
        className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize bg-white/0 hover:bg-primary/60"
      />
    </div>
  );
}

// -- music ----------------------------------------------------------------------

function MusicTrack({ studio, widthPx, pps, onAddMusic }: { studio: ReelStudioApi; widthPx: number; pps: number; onAddMusic: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { track, project, totalMs } = studio;
  const music = project.music;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !track) return;
    const w = Math.max(1, Math.min(16000, Math.round(widthPx)));
    const h = 36;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const end = music.trimEndMs ?? track.durationMs;
    const region = Math.max(1, end - music.trimStartMs);
    ctx.fillStyle = music.muted ? "rgba(255,255,255,0.2)" : "rgba(230,176,106,0.9)";
    for (let x = 0; x < w; x += 2) {
      const videoT = (x / w) * totalMs;
      let fileT = music.trimStartMs + videoT;
      if (videoT >= region) {
        if (!music.loop) break;
        fileT = music.trimStartMs + (videoT % region);
      }
      const peak = track.peaks[Math.min(track.peaks.length - 1, Math.floor((fileT / track.durationMs) * track.peaks.length))] ?? 0;
      const bh = Math.max(1, peak * h * 0.9);
      ctx.fillRect(x, (h - bh) / 2, 1.4, bh);
    }
    if (track.beat) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      const first = Math.ceil((music.trimStartMs - track.beat.offsetMs) / track.beat.beatMs);
      for (let k = first; ; k++) {
        const videoT = track.beat.offsetMs + k * track.beat.beatMs - music.trimStartMs;
        if (videoT > Math.min(totalMs, region)) break;
        if (videoT < 0) continue;
        ctx.fillRect(Math.round((videoT / totalMs) * w), 0, 1, 6);
      }
    }
  }, [track, music, totalMs, widthPx]);

  if (!track) {
    return (
      <button
        type="button"
        onClick={onAddMusic}
        className="my-1 flex h-9 items-center gap-2 rounded-md border border-dashed border-white/20 px-3 text-xs text-muted-foreground outline-none hover:border-primary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60"
        style={{ width: Math.max(180, widthPx) }}
      >
        <Plus className="size-3.5" /> {music.name ? `Re-import “${music.name}”` : "Add music"}
      </button>
    );
  }
  const selected = studio.selection?.type === "music";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Music track ${track.name}`}
      onClick={() => studio.setSelection({ type: "music" })}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && studio.setSelection({ type: "music" })}
      className={cn("relative my-1 h-9 cursor-pointer overflow-hidden rounded-md border outline-none focus-visible:ring-3 focus-visible:ring-ring/60", selected ? "border-primary bg-primary/10" : "border-white/10 bg-white/5")}
      style={{ width: widthPx }}
    >
      <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
      <span className="pointer-events-none absolute top-0.5 left-1.5 truncate text-[0.65rem] text-white/80" style={{ maxWidth: Math.max(60, pps * 8) }}>
        ♪ {track.name}
      </span>
    </div>
  );
}

// -- timeline -------------------------------------------------------------------

export function Timeline({ studio, onAddMusic }: { studio: ReelStudioApi; onAddMusic: () => void }) {
  const { slots, totalMs, project, player } = studio;
  const [pps, setPps] = useState(64);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);

  const widthPx = (totalMs / 1000) * pps;
  const selected = studio.selection;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => project.clips.map((c) => c.id), [project.clips]);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from >= 0 && to >= 0) studio.moveClip(from, to);
  };

  const overlays = useMemo(() => layoutLanes(resolveOverlays(project)), [project]);
  const lanes = overlays.reduce((m, o) => Math.max(m, o.lane + 1), 1);

  // Playhead position is written straight to the DOM; React never re-renders per frame.
  const syncPlayhead = useCallback(() => {
    const el = playhead.current;
    if (!el) return;
    const x = (player.time / 1000) * pps;
    el.style.transform = `translateX(${x}px)`;
    const sc = scroller.current;
    if (sc && player.isPlaying && (x > sc.scrollLeft + sc.clientWidth - 48 || x < sc.scrollLeft)) sc.scrollLeft = Math.max(0, x - 96);
  }, [player, pps]);
  useEffect(() => {
    syncPlayhead();
    const off = player.subscribeTime(syncPlayhead);
    return () => void off();
  }, [player, syncPlayhead]);

  const seekFromPointer = (clientX: number) => {
    const rect = content.current?.getBoundingClientRect();
    if (!rect) return;
    player.seek(((clientX - rect.left) / pps) * 1000);
  };
  const scrubDown = (e: PointerEvent<HTMLDivElement>) => {
    scrubbing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };
  const scrubMove = (e: PointerEvent<HTMLDivElement>) => {
    if (scrubbing.current) seekFromPointer(e.clientX);
  };
  const scrubKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 1000 : 100;
    if (e.key === "ArrowRight") player.seek(player.time + step);
    else if (e.key === "ArrowLeft") player.seek(player.time - step);
    else if (e.key === "Home") player.seek(0);
    else if (e.key === "End") player.seek(totalMs);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const fit = () => {
    const width = scroller.current?.clientWidth ?? 600;
    if (totalMs > 0) setPps(Math.min(MAX_PPS, Math.max(MIN_PPS, (width - 48) / (totalMs / 1000))));
  };

  const step = tickStep(pps);
  const ticks: number[] = [];
  for (let t = 0; t <= totalMs; t += step) ticks.push(t);

  const selectedClip = selected?.type === "clip" ? selected.id : null;

  return (
    <section aria-label="Timeline" className="flex min-h-0 flex-col border-t border-border bg-card/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
        <p className="mr-auto text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Timeline</span> · {project.clips.length} {project.clips.length === 1 ? "clip" : "clips"} · {formatDuration(totalMs)}
        </p>
        {selectedClip ? (
          <>
            <Button size="xs" variant="ghost" onClick={() => studio.duplicate(selectedClip)}>
              <Copy data-icon="inline-start" /> Duplicate
            </Button>
            <Button size="xs" variant="ghost" onClick={() => studio.deleteClip(selectedClip)}>
              <Trash2 data-icon="inline-start" /> Delete
            </Button>
          </>
        ) : null}
        <div className="flex items-center gap-1">
          <Button size="icon-xs" variant="ghost" aria-label="Zoom timeline out" onClick={() => setPps((p) => Math.max(MIN_PPS, p / 1.35))}>
            <ZoomOut />
          </Button>
          <input
            type="range"
            aria-label="Timeline zoom"
            className="reel-range hidden w-24 sm:block"
            min={MIN_PPS}
            max={MAX_PPS}
            value={pps}
            style={{ "--fill": `${((pps - MIN_PPS) / (MAX_PPS - MIN_PPS)) * 100}%` } as React.CSSProperties}
            onChange={(e) => setPps(Number(e.target.value))}
          />
          <Button size="icon-xs" variant="ghost" aria-label="Zoom timeline in" onClick={() => setPps((p) => Math.min(MAX_PPS, p * 1.35))}>
            <ZoomIn />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="Fit the whole reel in the timeline" onClick={fit}>
            <Maximize2 />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="sticky left-0 z-30 flex w-9 shrink-0 flex-col border-r border-border bg-card text-muted-foreground sm:w-24">
          <div className="h-6" />
          {[
            { icon: Film, label: "Photos", h: 64 },
            { icon: Type, label: "Text", h: lanes * 26 + 8 },
            { icon: Music2, label: "Music", h: 44 },
          ].map(({ icon: Icon, label, h }) => (
            <div key={label} className="flex items-center justify-center gap-1.5 border-t border-border text-xs sm:justify-start sm:px-3" style={{ height: h }}>
              <Icon aria-hidden className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>

        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div ref={content} className="relative" style={{ width: Math.max(widthPx + 120, 320) }}>
            <div
              role="slider"
              tabIndex={0}
              aria-label="Playhead. Drag, or use the arrow keys to move through the reel."
              aria-valuemin={0}
              aria-valuemax={totalMs}
              aria-valuenow={Math.round(player.time)}
              aria-valuetext={formatTimecode(player.time)}
              onPointerDown={scrubDown}
              onPointerMove={scrubMove}
              onPointerUp={() => (scrubbing.current = false)}
              onPointerCancel={() => (scrubbing.current = false)}
              onKeyDown={scrubKey}
              className="relative h-6 cursor-pointer touch-none border-b border-border outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {ticks.map((t) => (
                <span key={t} aria-hidden className="pointer-events-none absolute top-0 h-full border-l border-white/15 pl-1 text-[0.6rem] leading-6 text-muted-foreground" style={{ left: (t / 1000) * pps }}>
                  {formatDuration(t)}
                </span>
              ))}
            </div>

            <div className="relative flex h-16 items-stretch" onPointerDown={(e) => e.target === e.currentTarget && studio.setSelection(null)}>
              {slots.length === 0 ? (
                <p className="px-3 py-5 text-xs text-muted-foreground">Add photos from the Media tab to start your reel.</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                    {slots.map((slot, i) => {
                      const next = slots[i + 1];
                      const widthMs = (next ? next.startMs : slot.endMs) - slot.startMs;
                      return <ClipBlock key={slot.clip.id} studio={studio} slot={slot} widthMs={widthMs} pps={pps} selected={selectedClip === slot.clip.id} />;
                    })}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="relative border-t border-border" style={{ height: lanes * 26 + 8 }}>
              {overlays.map(({ item, lane }) => (
                <TextBlock key={item.overlay.id} studio={studio} item={item} lane={lane} pps={pps} selected={selected?.type === "text" && selected.id === item.overlay.id} />
              ))}
            </div>

            <div className="relative border-t border-border" style={{ height: 44 }}>
              <MusicTrack studio={studio} widthPx={Math.max(widthPx, 1)} pps={pps} onAddMusic={onAddMusic} />
            </div>

            <div ref={playhead} aria-hidden className="pointer-events-none absolute top-0 bottom-0 left-0 z-20 w-0 will-change-transform">
              <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-primary shadow-[0_0_6px_rgba(230,176,106,0.8)]" />
              <div className="absolute -top-0 -left-[5px] size-2.5 rotate-45 rounded-sm bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
