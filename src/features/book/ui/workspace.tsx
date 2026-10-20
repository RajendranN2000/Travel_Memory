"use client";

import { ChevronLeft, ChevronRight, Frame, Grid3x3, Magnet, Maximize2, Ruler, ZoomIn, ZoomOut, Columns2, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { spreadGroups } from "../pdf";
import { PageCanvas } from "./page-canvas";
import type { BookStudioApi } from "./use-book-studio";

function Toggle({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <Button size="icon-sm" variant={on ? "secondary" : "ghost"} aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      {children}
    </Button>
  );
}

function Ruler_({ lengthMm, pxPerMm, vertical, offsetMm }: { lengthMm: number; pxPerMm: number; vertical?: boolean; offsetMm: number }) {
  const ticks: number[] = [];
  for (let mm = 0; mm <= lengthMm; mm += 10) ticks.push(mm);
  const size = 16;
  return (
    <div aria-hidden className="pointer-events-none absolute bg-card/90 text-[9px] text-muted-foreground" style={vertical ? { left: -size, top: offsetMm * pxPerMm, width: size, height: lengthMm * pxPerMm } : { top: -size, left: offsetMm * pxPerMm, height: size, width: lengthMm * pxPerMm }}>
      {ticks.map((mm) => (
        <span key={mm} className="absolute border-muted-foreground/60" style={vertical ? { top: mm * pxPerMm, left: 0, right: 0, borderTopWidth: 1 } : { left: mm * pxPerMm, top: 0, bottom: 0, borderLeftWidth: 1 }}>
          <span className={vertical ? "absolute top-0.5 left-0.5 -rotate-90 origin-top-left translate-y-4" : "absolute top-0 left-1"}>{mm % 50 === 0 ? mm / 10 : ""}</span>
        </span>
      ))}
    </div>
  );
}

export function Workspace({ studio }: { studio: BookStudioApi }) {
  const { project, view, pageIndex } = studio;
  const holder = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setAvail({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const s = project.settings;
  const bleed = view.bleed ? s.bleedMm : 0;
  const pageW = s.widthMm + 2 * bleed;
  const pageH = s.heightMm + 2 * bleed;

  // Spread: the group of pages that share a spread with the current page.
  const groups = spreadGroups(project.pages.length);
  const group = groups.find((g) => g.includes(pageIndex)) ?? [pageIndex];
  const showSpread = view.spread && project.pages.length > 1;
  const gap = showSpread ? 6 : 0;
  const slots = showSpread ? 2 : 1;
  const contentW = pageW * slots + gap;
  const pad = view.rulers ? 56 : 40;
  const fit = Math.max(0.3, Math.min((avail.w - pad * 2) / contentW, (avail.h - pad * 2) / pageH));
  const pxPerMm = fit * (view.zoom === "fit" ? 1 : view.zoom);

  const zoomPct = Math.round((pxPerMm / (96 / 25.4)) * 100);
  const setZoom = (factor: number) => studio.setView({ zoom: Math.min(6, Math.max(0.2, (view.zoom === "fit" ? 1 : view.zoom) * factor)) });

  let left: number | null = null;
  let right: number | null = null;
  if (!showSpread) left = pageIndex;
  else if (group.length === 2) [left, right] = group;
  else if (group[0] === 0) right = 0;
  else left = group[0];

  const canvasFor = (i: number | null) =>
    i === null ? <div style={{ width: pageW * pxPerMm, height: pageH * pxPerMm }} aria-hidden /> : <PageCanvas studio={studio} page={project.pages[i]} index={i} pxPerMm={pxPerMm} />;

  return (
    <section aria-label="Page canvas" className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[color-mix(in_oklab,var(--background),#000_8%)] bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground),transparent_88%)_1px,transparent_1px)] bg-[length:18px_18px]">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card/90 px-2 py-1 backdrop-blur">
        <span className="mr-1 hidden text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase sm:inline">View</span>
        <Toggle on={!view.spread} onClick={() => studio.setView({ spread: false })} label="Single page view">
          <Square />
        </Toggle>
        <Toggle on={view.spread} onClick={() => studio.setView({ spread: true })} label="Facing-page spread view">
          <Columns2 />
        </Toggle>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Toggle on={view.bleed} onClick={() => studio.setView({ bleed: !view.bleed })} label="Show bleed area">
          <Frame />
        </Toggle>
        <Toggle on={view.margins} onClick={() => studio.setView({ margins: !view.margins })} label="Show margins">
          <Maximize2 />
        </Toggle>
        <Toggle on={view.safe} onClick={() => studio.setView({ safe: !view.safe })} label="Show print-safe area">
          <span className="text-[0.65rem] font-bold">SAFE</span>
        </Toggle>
        <Toggle on={view.grid} onClick={() => studio.setView({ grid: !view.grid })} label="Show grid">
          <Grid3x3 />
        </Toggle>
        <Toggle on={view.snap} onClick={() => studio.setView({ snap: !view.snap })} label="Snap to guides">
          <Magnet />
        </Toggle>
        <Toggle on={view.rulers} onClick={() => studio.setView({ rulers: !view.rulers })} label="Show rulers">
          <Ruler />
        </Toggle>
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Zoom out" onClick={() => setZoom(1 / 1.25)}>
            <ZoomOut />
          </Button>
          <button type="button" className="min-w-14 rounded px-1 text-center text-xs tabular-nums hover:bg-accent" onClick={() => studio.setView({ zoom: "fit" })} aria-label="Fit page to window">
            {view.zoom === "fit" ? "Fit" : `${zoomPct}%`}
          </button>
          <Button size="icon-sm" variant="ghost" aria-label="Zoom in" onClick={() => setZoom(1.25)}>
            <ZoomIn />
          </Button>
        </div>
      </div>

      <div ref={holder} className="relative min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full min-w-full items-center justify-center" style={{ padding: pad }}>
          <div key={pageIndex} className={cn("relative flex animate-in items-start fade-in duration-300")} style={{ gap: gap * pxPerMm }}>
            {view.rulers && !showSpread ? (
              <>
                <Ruler_ lengthMm={s.widthMm} pxPerMm={pxPerMm} offsetMm={bleed} />
                <Ruler_ lengthMm={s.heightMm} pxPerMm={pxPerMm} vertical offsetMm={bleed} />
              </>
            ) : null}
            {canvasFor(left)}
            {showSpread ? canvasFor(right) : null}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-2">
        <Button size="icon" variant="secondary" className="pointer-events-auto rounded-full opacity-70 shadow-lg transition-all duration-300 hover:-translate-x-0.5 hover:opacity-100" aria-label="Previous page" disabled={pageIndex === 0} onClick={() => studio.goToPage(pageIndex - 1)}>
          <ChevronLeft />
        </Button>
        <Button size="icon" variant="secondary" className="pointer-events-auto rounded-full opacity-70 shadow-lg transition-all duration-300 hover:translate-x-0.5 hover:opacity-100" aria-label="Next page" disabled={pageIndex >= project.pages.length - 1} onClick={() => studio.goToPage(pageIndex + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </section>
  );
}
