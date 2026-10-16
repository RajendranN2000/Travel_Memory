"use client";

import { ImageOff, Loader2, Pause, Play, SkipBack, SkipForward, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimecode } from "../config";
import { safeInsets } from "./safe-area";
import { usePlaying, useTenths, type ReelStudioApi } from "./use-reel-studio";

function TimeReadout({ studio }: { studio: ReelStudioApi }) {
  useTenths(studio.player);
  return (
    <p className="min-w-[8.5rem] text-center text-sm text-muted-foreground tabular-nums" aria-live="off">
      <span className="text-foreground">{formatTimecode(studio.player.time)}</span> / {formatTimecode(studio.totalMs)}
    </p>
  );
}

function PlayButton({ studio }: { studio: ReelStudioApi }) {
  const playing = usePlaying(studio.player);
  return (
    <Button
      size="icon-lg"
      className="rounded-full"
      aria-label={playing ? "Pause (Space)" : "Play (Space)"}
      onClick={() => studio.player.toggle()}
      disabled={studio.project.clips.length === 0}
    >
      {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
    </Button>
  );
}

export function PreviewStage({ studio, onOpenMedia }: { studio: ReelStudioApi; onOpenMedia: () => void }) {
  const { preview, project, prefs, setCanvas } = studio;
  const ratio = preview.width / preview.height;
  const insets = safeInsets(project.aspect);
  const failed = Object.keys(studio.loadErrors).filter((id) => project.clips.some((c) => c.sourceId === id));
  const empty = project.clips.length === 0;

  return (
    <section aria-label="Reel preview" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 p-3 [container-type:size]">
        <div className="mx-auto flex h-full items-center justify-center">
          <div className="relative overflow-hidden rounded-xl bg-black shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10" style={{ aspectRatio: ratio, width: `min(100cqw, calc(100cqh * ${ratio}))` }}>
            <canvas ref={setCanvas} role="img" aria-label="Live preview of your reel" className="block h-full w-full" />

            {empty ? (
              <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
                <div className="max-w-xs space-y-3">
                  <ImageOff aria-hidden className="mx-auto size-8 text-muted-foreground" />
                  <p className="font-medium">No photos in this reel</p>
                  <p className="text-sm text-muted-foreground">Choose photos from your memory, or add some from this device.</p>
                  <Button size="sm" onClick={onOpenMedia}>
                    Choose photos
                  </Button>
                </div>
              </div>
            ) : null}

            {studio.busy && !empty ? (
              <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white" role="status">
                <Loader2 aria-hidden className="size-3.5 motion-safe:animate-spin" /> Preparing photos
              </div>
            ) : null}

            {prefs.safeArea ? (
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 bg-red-500/15" style={{ height: `${insets.top * 100}%` }} />
                <div className="absolute inset-x-0 bottom-0 bg-red-500/15" style={{ height: `${insets.bottom * 100}%` }} />
                <div className="absolute inset-y-0 left-0 bg-red-500/15" style={{ width: `${insets.left * 100}%` }} />
                <div className="absolute inset-y-0 right-0 bg-red-500/15" style={{ width: `${insets.right * 100}%` }} />
                <div
                  className="absolute border border-dashed border-white/70"
                  style={{ top: `${insets.top * 100}%`, bottom: `${insets.bottom * 100}%`, left: `${insets.left * 100}%`, right: `${insets.right * 100}%` }}
                />
                <span className="absolute top-1 left-2 text-[0.6rem] tracking-wide text-white/80 uppercase">Safe area</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {failed.length > 0 ? (
        <p role="alert" className="mx-3 mb-2 flex items-start gap-2 rounded-lg bg-destructive/15 p-2.5 text-xs text-destructive">
          <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {failed.length === 1 ? "A photo couldn't be loaded." : `${failed.length} photos couldn't be loaded.`} {studio.loadErrors[failed[0]]}
          </span>
        </p>
      ) : null}

      <div className="flex items-center justify-center gap-2 px-3 pb-2">
        <Button size="icon-sm" variant="ghost" aria-label="Back to the start" onClick={() => studio.player.seek(0)} disabled={empty}>
          <SkipBack />
        </Button>
        <PlayButton studio={studio} />
        <Button size="icon-sm" variant="ghost" aria-label="Jump to the end" onClick={() => studio.player.seek(studio.totalMs)} disabled={empty}>
          <SkipForward />
        </Button>
        <TimeReadout studio={studio} />
      </div>
    </section>
  );
}
