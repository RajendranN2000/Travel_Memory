"use client";

import { CheckCircle2, Download, Info, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fpsWarning, type ExportFormat } from "../capabilities";
import { ASPECT_INFO, estimateFileSizeMb, formatDuration, videoBitrate } from "../config";
import { Segmented } from "./controls";
import type { ReelStudioApi } from "./use-reel-studio";

const PHASE_LABEL = {
  preparing: "Getting photos and fonts ready",
  rendering: "Rendering your reel",
  paused: "Paused",
  finalizing: "Finishing the file",
} as const;

export function ExportDialog({ studio, open, onOpenChange }: { studio: ReelStudioApi; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { project, capabilities, exportUi, finalSize, totalMs } = studio;
  const [chosen, setChosen] = useState<ExportFormat | null>(null);
  const running = exportUi.status === "running";
  const format = capabilities.formats.find((f) => f.format === chosen) ?? capabilities.preferred;
  const bitrate = videoBitrate(finalSize.width, finalSize.height, project.fps);
  const warn = fpsWarning(project.fps, finalSize.width, finalSize.height);
  const silent = project.music.muted || !studio.track;
  const canStart = capabilities.canExport && format !== null && project.clips.length > 0;

  const close = (next: boolean) => {
    if (running) return; // a render in progress can only be cancelled explicitly
    if (!next && exportUi.status !== "done") studio.resetExport();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={!running}
        onEscapeKeyDown={(e) => running && e.preventDefault()}
        onPointerDownOutside={(e) => running && e.preventDefault()}
        onInteractOutside={(e) => running && e.preventDefault()}
        className="max-h-[92svh] gap-4 overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{exportUi.status === "done" ? "Your reel is ready" : running ? "Rendering your reel" : "Export video"}</DialogTitle>
          <DialogDescription>
            {exportUi.status === "done"
              ? "The video was made in this browser. Nothing was uploaded."
              : "The video is rendered right here on your device. Your photos and music are never uploaded."}
          </DialogDescription>
        </DialogHeader>

        {exportUi.status === "idle" || exportUi.status === "error" ? (
          <div className="space-y-4">
            {exportUi.status === "error" ? (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  {exportUi.message} Your edits are safe, so you can try again.
                </span>
              </p>
            ) : null}
            {exportUi.status === "idle" && exportUi.cancelled ? <p className="rounded-lg bg-muted p-3 text-sm">Export cancelled. Nothing was saved.</p> : null}

            {!capabilities.canExport ? (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {capabilities.blocker}
              </p>
            ) : (
              <>
                {capabilities.formats.length > 1 ? (
                  <Segmented
                    label="File format"
                    value={format?.format ?? "webm"}
                    options={capabilities.formats.map((f) => ({ value: f.format, label: f.label }))}
                    onChange={setChosen}
                  />
                ) : null}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-muted p-4 text-sm">
                  <dt className="text-muted-foreground">Length</dt>
                  <dd className="text-right tabular-nums">{formatDuration(totalMs)}</dd>
                  <dt className="text-muted-foreground">Shape</dt>
                  <dd className="text-right">
                    {ASPECT_INFO[project.aspect].label} · {ASPECT_INFO[project.aspect].use}
                  </dd>
                  <dt className="text-muted-foreground">Resolution</dt>
                  <dd className="text-right tabular-nums">
                    {finalSize.width} × {finalSize.height} at {project.fps} fps
                  </dd>
                  <dt className="text-muted-foreground">Format</dt>
                  <dd className="text-right">{format?.label}</dd>
                  <dt className="text-muted-foreground">Sound</dt>
                  <dd className="text-right">{silent ? "Silent" : capabilities.canMixAudio ? `Music: ${project.music.name}` : "Silent (not supported here)"}</dd>
                  <dt className="text-muted-foreground">Estimated file</dt>
                  <dd className="text-right tabular-nums">about {estimateFileSizeMb(totalMs, bitrate).toFixed(1)} MB</dd>
                  <dt className="text-muted-foreground">Rendering time</dt>
                  <dd className="text-right tabular-nums">about {formatDuration(totalMs + 4000)}</dd>
                </dl>
                {warn ? <p className="rounded-lg bg-warning/15 p-3 text-xs text-warning">{warn}</p> : null}
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {capabilities.notes.map((n) => (
                    <li key={n} className="flex gap-2">
                      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" /> {n}
                    </li>
                  ))}
                  <li className="flex gap-2">
                    <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" /> Speed depends on the video&apos;s length, photo sizes, your browser and device.
                  </li>
                </ul>
              </>
            )}
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="ghost" onClick={() => close(false)}>
                Close
              </Button>
              <Button onClick={() => format && void studio.startExport(format)} disabled={!canStart}>
                <Download data-icon="inline-start" /> {exportUi.status === "error" ? "Try again" : "Render video"}
              </Button>
            </DialogFooter>
            {project.clips.length === 0 ? <p className="text-xs text-muted-foreground">Add at least one photo to the reel first.</p> : null}
          </div>
        ) : null}

        {exportUi.status === "running" ? (
          <div className="space-y-4" aria-live="polite">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {exportUi.progress.phase === "paused" ? null : <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />}
                  {PHASE_LABEL[exportUi.progress.phase]}
                </span>
                <span className="tabular-nums">{Math.round(exportUi.progress.fraction * 100)}%</span>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(exportUi.progress.fraction * 100)} aria-label="Export progress" className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${exportUi.progress.fraction * 100}%` }} />
              </div>
            </div>
            {exportUi.progress.message ? <p className="rounded-lg bg-muted p-3 text-sm">{exportUi.progress.message}</p> : null}
            <p className="text-xs text-muted-foreground">
              {formatDuration(exportUi.progress.elapsedMs)} of {formatDuration(exportUi.progress.totalMs)} rendered
              {exportUi.progress.measuredFps > 0 ? ` · ${exportUi.progress.measuredFps.toFixed(0)} fps` : ""}. Keep this tab open and visible until it finishes.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={studio.cancelExport}>
                Cancel export
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {exportUi.status === "done" ? (
          <div className="space-y-4">
            <div className="mx-auto max-h-[46svh] overflow-hidden rounded-xl bg-black" style={{ aspectRatio: exportUi.result.width / exportUi.result.height, width: `min(100%, calc(46svh * ${exportUi.result.width / exportUi.result.height}))` }}>
              <video src={exportUi.url} controls playsInline className="h-full w-full" aria-label="Preview of the rendered reel" />
            </div>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                {exportUi.result.width} × {exportUi.result.height} {exportUi.result.format.toUpperCase()} · {(exportUi.result.blob.size / 1_000_000).toFixed(1)} MB
                {exportUi.result.measuredFps > 0 && exportUi.result.measuredFps < project.fps * 0.85
                  ? `. This device rendered about ${exportUi.result.measuredFps.toFixed(0)} fps, so motion may look less smooth than the preview. Try a lower resolution or frame rate.`
                  : ""}
              </span>
            </p>
            {studio.kept === true ? (
              <p className="text-xs text-muted-foreground">
                A copy is kept in this browser. Find it any time in{" "}
                <Link href="/my-memories?tab=reels" className="text-primary underline underline-offset-2">
                  My memories → Reels
                </Link>
                .
              </p>
            ) : studio.kept === false ? (
              <p className="text-xs text-muted-foreground">This browser couldn&apos;t keep a copy, so download the video now to save it.</p>
            ) : null}
            {exportUi.result.format === "webm" ? (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Saved as WebM because this browser can&apos;t write MP4. Convert it to MP4 if an app won&apos;t accept it.</p>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => studio.resetExport()}>
                <RefreshCw data-icon="inline-start" /> Render again
              </Button>
              <Button asChild>
                <a href={exportUi.url} download={exportUi.filename}>
                  <Download data-icon="inline-start" /> Download video
                </a>
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
