"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PreviewDevice = "mobile" | "desktop";

const DESKTOP_WIDTH = 1280;

/**
 * A scroll area with a slim overlay scrollbar. The native bar is hidden because
 * it takes up layout width (so the template no longer matches the real phone
 * width), clashes with the rounded frame and shows as a white strip beside
 * themed pages. The overlay thumb floats over the content, fades out when idle
 * and never changes the layout.
 */
function OverlayScroll({
  children,
  className,
  wrapperClassName,
  label,
}: {
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
  label: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null);
  const [active, setActive] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumb(null);
      return;
    }
    // Keep the thumb clear of the frame's rounded corners.
    const inset = 14;
    const track = clientHeight - inset * 2;
    const height = Math.max(36, (track * clientHeight) / scrollHeight);
    const top = inset + ((track - height) * scrollTop) / (scrollHeight - clientHeight);
    setThumb({ top, height });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const onScroll = () => {
    measure();
    setActive(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActive(false), 900);
  };

  return (
    <div className={cn("relative", wrapperClassName)}>
      <div
        ref={scroller}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label={label}
        className={cn("overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
      >
        {children}
      </div>
      {thumb ? (
        <span
          aria-hidden
          style={{ top: thumb.top, height: thumb.height }}
          className={cn(
            "pointer-events-none absolute right-1 w-1 rounded-full bg-black/40 ring-1 ring-white/50 transition-opacity duration-300",
            active ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </div>
  );
}

/**
 * Shows content inside a phone frame (real 390px width) or a desktop browser
 * frame (rendered at 1280px and scaled to fit). Templates use container
 * queries, so each frame shows the layout that device would really get.
 */
export function DevicePreview({
  device,
  label,
  children,
  className,
  height = "h-[min(46rem,72svh)]",
}: {
  device: PreviewDevice;
  label: string;
  children: ReactNode;
  className?: string;
  height?: string;
}) {
  if (device === "mobile") {
    return (
      <div className={cn("mx-auto w-full max-w-[24.5rem] rounded-[2.25rem] bg-ink p-2.5 shadow-lifted", className)}>
        {/* On phones the frame is already life-size, so it grows to full height and
            scrolls with the page instead of trapping swipes in a nested scroller. */}
        <OverlayScroll
          label={label}
          wrapperClassName="overflow-hidden rounded-[1.75rem] bg-white"
          className={cn("overscroll-contain", height, "max-lg:h-auto! max-lg:overflow-hidden max-lg:overscroll-auto")}
        >
          {children}
        </OverlayScroll>
      </div>
    );
  }
  return (
    <div className={cn("w-full min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-lifted", className)}>
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-4 py-2.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
      </div>
      <ScaledFrame label={label} height={height}>
        {children}
      </ScaledFrame>
    </div>
  );
}

function ScaledFrame({ children, label, height }: { children: ReactNode; label: string; height: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useEffect(() => {
    const outerEl = outer.current;
    const innerEl = inner.current;
    if (!outerEl || !innerEl) return;
    const observer = new ResizeObserver(() => {
      setScale(Math.min(1, outerEl.clientWidth / DESKTOP_WIDTH));
      setContentHeight(innerEl.offsetHeight);
    });
    observer.observe(outerEl);
    observer.observe(innerEl);
    return () => observer.disconnect();
  }, []);

  return (
    // contain:inline-size stops the 1280px canvas from widening the page: the
    // frame takes its width from the layout, and the canvas is scaled to it.
    <OverlayScroll label={label} className={cn("w-full overflow-x-hidden overscroll-contain [contain:inline-size]", height)}>
      <div ref={outer} className="overflow-hidden" style={{ height: contentHeight === null ? undefined : contentHeight * scale }}>
        <div ref={inner} style={{ width: DESKTOP_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </OverlayScroll>
  );
}

export function DeviceToggle({
  value,
  onChange,
  className,
}: {
  value: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Preview size" className={cn("inline-flex rounded-md border border-border bg-card p-1", className)}>
      {(["mobile", "desktop"] as const).map((device) => (
        <button
          key={device}
          type="button"
          aria-pressed={value === device}
          onClick={() => onChange(device)}
          className={cn(
            "min-h-10 rounded-sm px-4 text-sm font-medium capitalize transition-colors",
            value === device ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {device}
        </button>
      ))}
    </div>
  );
}
