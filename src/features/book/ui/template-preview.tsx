"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderPage } from "../display-list";
import { FontStore, resolveFont, type ResolvedFont } from "../fonts";
import { BookImages } from "../images";
import { autoFitProject } from "../ops";
import { previewPages, type BookTemplate } from "../templates";
import type { BookBrief } from "../types";
import { cn } from "@/lib/utils";
import { PageView } from "./page-view";

/*
 * Template previews are real renders: the template builds actual pages from sample (or your) photos
 * and they are drawn by the same page renderer as the editor, so what you see is the layout you get.
 */
const previewFonts = new FontStore();
const pools = new Map<string, BookImages>();

function poolFor(brief: BookBrief): BookImages {
  let pool = pools.get(brief.tripId);
  if (!pool) {
    pool = new BookImages(12);
    pool.register(brief.sources);
    pools.set(brief.tripId, pool);
  }
  pool.revive();
  return pool;
}

export function TemplatePreview({ template, brief, height = 168, className }: { template: BookTemplate; brief: BookBrief; height?: number; className?: string }) {
  const images = useMemo(() => poolFor(brief), [brief]);
  const built = useMemo(() => previewPages(template, brief), [template, brief]);
  const [version, setVersion] = useState(0);
  // Once the fonts are in, shrink any text that would overflow, exactly as the editor does for a new book.
  const { project, pages } = useMemo(() => {
    if (version === 0) return built;
    const fitted = autoFitProject(built.project, previewFonts);
    const ids = new Set(built.pages.map((p) => p.id));
    return { project: fitted, pages: fitted.pages.filter((p) => ids.has(p.id)) };
  }, [built, version]);
  const sizes = useMemo(() => new Map(brief.sources.map((s) => [s.id, { width: s.width, height: s.height }])), [brief.sources]);

  const fontsNeeded = useMemo(() => {
    const map = new Map<string, ResolvedFont>();
    for (const p of built.pages) for (const e of p.elements) if (e.type === "text") map.set(resolveFont(e.style.font, e.style.bold, e.style.italic).file, resolveFont(e.style.font, e.style.bold, e.style.italic));
    return [...map.values()];
  }, [built.pages]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(fontsNeeded.map((f) => previewFonts.register(f))).then(() => !cancelled && setVersion((v) => v + 1));
    return () => {
      cancelled = true;
    };
  }, [fontsNeeded]);

  const holder = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const s = project.settings;
  const shown = pages.slice(0, 3);
  // The pages overlap like a spread; shrink them so the whole composition fits the available width.
  const spreadFactor = shown.length === 1 ? 1 : shown.length === 2 ? 1.68 : 2.54;
  const fitHeight = width > 0 ? (width / spreadFactor) * (s.heightMm / s.widthMm) : height;
  const h = Math.max(40, Math.min(height, fitHeight));
  const w = (h * s.widthMm) / s.heightMm;
  const px = h / s.heightMm;

  return (
    <div ref={holder} className={cn("flex items-end justify-center overflow-hidden", className)} aria-hidden data-v={version}>
      {shown.map((page, i) => {
        const render = renderPage(project, page, { measurer: previewFonts, sources: sizes, pageNumber: i + 1 });
        const first = i === 0;
        return (
          <div
            key={page.id}
            className="shrink-0 overflow-hidden bg-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] ring-1 ring-black/10"
            style={{ width: w * (first ? 1 : 0.86), height: first ? h : h * 0.86, marginLeft: i === 0 ? 0 : i === 1 ? -w * 0.18 : -2, zIndex: 3 - i }}
          >
            <PageView render={render} images={images} pxPerMm={px} />
          </div>
        );
      })}
    </div>
  );
}
