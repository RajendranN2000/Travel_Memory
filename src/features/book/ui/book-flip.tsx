"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageView } from "./page-view";
import type { BookStudioApi } from "./use-book-studio";

const FLIP_MS = 900;

/**
 * A physical-book preview. The book is a stack of leaves: each leaf has a page on its front and the
 * next page on its back, and turning it swings it around the spine in 3D. The cover starts closed on
 * the right; the back cover ends closed on the left; the book re-centres as it opens and closes.
 */
export function BookFlip({ studio, startPage = 0 }: { studio: BookStudioApi; startPage?: number }) {
  const { project } = studio;
  const pages = project.pages;
  const count = pages.length;
  const leafCount = Math.ceil(count / 2);
  const s = project.settings;
  const aspect = s.heightMm / s.widthMm;

  const [turned, setTurned] = useState(() => Math.min(leafCount, Math.ceil(startPage / 2)));
  const [moving, setMoving] = useState<ReadonlySet<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [delays, setDelays] = useState<ReadonlyMap<number, number>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback(
    (target: number) => {
      const next = Math.max(0, Math.min(leafCount, target));
      setTurned((cur) => {
        if (next === cur) return cur;
        const lo = Math.min(cur, next);
        const hi = Math.max(cur, next);
        const changed = Array.from({ length: hi - lo }, (_, i) => lo + i);
        // Leaves turn one after another when jumping, in the direction of travel.
        const ordered = next > cur ? changed : [...changed].reverse();
        setDelays(new Map(ordered.map((k, rank) => [k, Math.min(rank * 70, 560)])));
        setMoving(new Set(changed));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setMoving(new Set()), FLIP_MS + Math.min(ordered.length * 70, 560));
        return next;
      });
    },
    [leafCount],
  );
  const next = useCallback(() => goTo(turned + 1), [goTo, turned]);
  const prev = useCallback(() => goTo(turned - 1), [goTo, turned]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Auto-play: turn a page every couple of seconds, then stop at the back cover.
  const autoplay = playing && turned < leafCount;
  useEffect(() => {
    if (!autoplay) return;
    const id = setTimeout(() => goTo(turned + 1), turned === 0 ? 700 : 2200);
    return () => clearTimeout(id);
  }, [autoplay, turned, goTo]);

  const closedFront = turned === 0;
  const closedBack = turned >= leafCount;
  const leftPage = turned > 0 ? 2 * turned - 1 : null;
  const rightPage = turned < leafCount ? 2 * turned : null;
  const label = useMemo(() => {
    if (leftPage !== null && rightPage !== null && rightPage < count) return `Pages ${leftPage + 1} and ${rightPage + 1} of ${count}`;
    const only = rightPage !== null && rightPage < count ? rightPage : leftPage;
    return only === 0 ? "Front cover" : only === count - 1 ? `Back cover · page ${count} of ${count}` : `Page ${(only ?? 0) + 1} of ${count}`;
  }, [leftPage, rightPage, count]);

  const onPointerDown = (e: PointerEvent) => {
    press.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = press.current;
    press.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (e.clientX > r.left + r.width / 2) next();
      else prev();
    }
  };

  const faceFor = (index: number | null, nearLeaf: boolean) =>
    index !== null && index < count && nearLeaf ? (
      <PageView render={studio.renderOf(pages[index], index)} images={studio.images} pxPerMm={4} />
    ) : null;

  const style = {
    "--pw": `min(43vw, calc(56svh / ${aspect}), 560px)`,
    "--ph": `calc(var(--pw) * ${aspect})`,
  } as CSSProperties;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative grid place-items-center overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_35%,#4a4136_0%,#2a241d_55%,#16120e_100%)] px-2 py-8 sm:py-12"
        style={{ ...style, minHeight: "calc(var(--ph) + 5rem)" }}
      >
        <div
          role="group"
          aria-label="Book preview. Click a page, swipe, or use the arrow keys to turn pages."
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (press.current = null)}
          className="relative cursor-pointer touch-pan-y select-none"
          style={{ width: "calc(var(--pw) * 2)", height: "var(--ph)", perspective: "2600px" }}
        >
          <div
            className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.645,0.045,0.355,1)] motion-reduce:duration-0"
            style={{ transformStyle: "preserve-3d", transform: closedFront ? "translateX(calc(var(--pw) / -2))" : closedBack ? "translateX(calc(var(--pw) / 2))" : "translateX(0)" }}
          >
            {/* soft shadow on the table */}
            <div aria-hidden className="absolute inset-x-6 -bottom-5 h-8 rounded-[50%] bg-black/55 blur-xl" />
            {/* the pages' edge thickness */}
            <div aria-hidden className={cn("absolute top-1 right-0 bottom-1 w-[calc(var(--pw)+6px)] rounded-r-sm bg-[repeating-linear-gradient(to_right,#e9e4da,#e9e4da_1px,#cfc9bd_2px)] transition-opacity duration-500", closedBack && "opacity-0", turned === leafCount - 1 && "opacity-70")} style={{ left: "50%", opacity: closedBack ? 0 : undefined }} />

            {Array.from({ length: leafCount }, (_, k) => {
              const flipped = k < turned;
              const near = Math.abs(k - turned) <= 2 || Math.abs(k - (turned - 1)) <= 2;
              const isMoving = moving.has(k);
              const frontIdx = 2 * k;
              const backIdx = 2 * k + 1;
              const delay = isMoving ? (delays.get(k) ?? 0) : 0;
              return (
                <div
                  key={k}
                  aria-hidden
                  className="absolute top-0 h-full ease-[cubic-bezier(0.645,0.045,0.355,1)] motion-reduce:duration-0"
                  style={{
                    left: "50%",
                    width: "var(--pw)",
                    transformOrigin: "left center",
                    transformStyle: "preserve-3d",
                    transform: flipped ? "rotateY(-180deg)" : "rotateY(0deg)",
                    zIndex: flipped ? k + 1 : leafCount - k,
                    transitionProperty: "transform, z-index",
                    transitionDuration: `${FLIP_MS}ms, 0ms`,
                    transitionDelay: `${delay}ms, ${delay + FLIP_MS / 2}ms`,
                  }}
                >
                  {/* front of the leaf: a right-hand page */}
                  <div className={cn("absolute inset-0 overflow-hidden bg-white [backface-visibility:hidden]", k === 0 ? "rounded-r-md shadow-[0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-black/25" : "rounded-r-[2px] ring-1 ring-black/10")}>
                    {faceFor(frontIdx, near)}
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 via-black/[0.04] to-transparent" />
                    {isMoving ? <div aria-hidden className="pointer-events-none absolute inset-0 animate-[leaf-shade_900ms_ease-in-out_both] bg-gradient-to-l from-black/35 to-transparent" style={{ animationDelay: `${delay}ms` }} /> : null}
                  </div>
                  {/* back of the leaf: a left-hand page */}
                  <div className="absolute inset-0 overflow-hidden rounded-l-[2px] bg-white ring-1 ring-black/10 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    {faceFor(backIdx, near)}
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/25 via-black/[0.04] to-transparent" />
                    {isMoving ? <div aria-hidden className="pointer-events-none absolute inset-0 animate-[leaf-shade_900ms_ease-in-out_both] bg-gradient-to-r from-black/35 to-transparent" style={{ animationDelay: `${delay}ms` }} /> : null}
                  </div>
                </div>
              );
            })}

            {/* the fold at the spine */}
            <div aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-1/2 w-[calc(var(--pw)*0.08)] -translate-x-1/2 bg-[linear-gradient(to_right,transparent,rgba(0,0,0,0.28)_48%,rgba(0,0,0,0.28)_52%,transparent)] transition-opacity duration-500", (closedFront || closedBack) && "opacity-0")} style={{ zIndex: leafCount + 5 }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button size="icon" variant="secondary" aria-label="Previous page" disabled={turned === 0} onClick={prev}>
          <ChevronLeft />
        </Button>
        <input
          type="range"
          min={0}
          max={leafCount}
          value={turned}
          aria-label="Turn to a page"
          onChange={(e) => {
            setPlaying(false);
            goTo(Number(e.target.value));
          }}
          className="h-8 min-w-0 flex-1 accent-[var(--primary)]"
        />
        <Button size="icon" variant="secondary" aria-label="Next page" disabled={turned >= leafCount} onClick={next}>
          <ChevronRight />
        </Button>
        <Button
          size="sm"
          variant={autoplay ? "default" : "outline"}
          onClick={() => {
            if (autoplay) setPlaying(false);
            else {
              if (turned >= leafCount) goTo(0);
              setPlaying(true);
            }
          }}
        >
          {autoplay ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
          <span className="hidden sm:inline">{autoplay ? "Pause" : "Play"}</span>
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
