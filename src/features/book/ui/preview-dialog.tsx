"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { spreadGroups } from "../pdf";
import { PageView } from "./page-view";
import type { BookStudioApi } from "./use-book-studio";

/** Flip through the whole book as spreads: the cover on its own, then facing pages, then the back cover. */
export function PreviewDialog({ studio, open, onOpenChange }: { studio: BookStudioApi; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96svh] gap-3 sm:max-w-[min(96vw,1100px)]">{open ? <PreviewBody studio={studio} /> : null}</DialogContent>
    </Dialog>
  );
}

/** Mounted only while open, so it always starts on the page being edited. */
function PreviewBody({ studio }: { studio: BookStudioApi }) {
  const { project } = studio;
  const groups = spreadGroups(project.pages.length);
  const startGroup = Math.max(0, groups.findIndex((g) => g.includes(studio.pageIndex)));
  const [index, setIndex] = useState(startGroup);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(groups.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groups.length]);

  const group = groups[Math.min(index, groups.length - 1)] ?? [];
  const s = project.settings;
  const pair = group.length === 2;
  const onlyBack = group.length === 1 && group[0] === project.pages.length - 1 && project.pages.length > 1;
  const left = pair ? group[0] : onlyBack ? group[0] : null;
  const right = pair ? group[1] : onlyBack ? null : (group[0] ?? null);
  const pageW = `min(${pair ? 42 : 36}vw, calc(${58}svh * ${s.widthMm / s.heightMm}))`;

  const sheet = (i: number | null) =>
    i === null ? (
      <div style={{ width: pageW, aspectRatio: `${s.widthMm}/${s.heightMm}` }} aria-hidden />
    ) : (
      <div className="overflow-hidden bg-white shadow-[0_12px_40px_-10px_rgba(0,0,0,0.55)] ring-1 ring-black/10" style={{ width: pageW }}>
        <PageView render={studio.renderOf(project.pages[i], i)} images={studio.images} pxPerMm={5} />
      </div>
    );

  return (
    <>
        <DialogHeader>
          <DialogTitle>Preview: {project.title}</DialogTitle>
          <DialogDescription>
            {group.length === 2 ? `Pages ${group[0] + 1} and ${group[1] + 1}` : `Page ${(group[0] ?? 0) + 1}`} of {project.pages.length}. Use the arrow keys to turn pages. Trimmed size, without bleed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-1 rounded-xl bg-muted p-4" style={{ minHeight: "60svh" }}>
          <Button size="icon" variant="ghost" aria-label="Previous spread" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
            <ChevronLeft />
          </Button>
          <div className="flex items-center justify-center">
            {sheet(left)}
            {sheet(right)}
          </div>
          <Button size="icon" variant="ghost" aria-label="Next spread" disabled={index >= groups.length - 1} onClick={() => setIndex((i) => Math.min(groups.length - 1, i + 1))}>
            <ChevronRight />
          </Button>
        </div>
    </>
  );
}
