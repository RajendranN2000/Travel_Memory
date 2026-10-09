"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PreviewDevice = "mobile" | "desktop";

const DESKTOP_WIDTH = 1280;

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
        <div
          className={cn(
            "overflow-y-auto overscroll-contain rounded-[1.75rem] bg-white",
            height,
            "max-lg:h-auto! max-lg:overflow-hidden max-lg:overscroll-auto",
          )}
          tabIndex={0}
          role="region"
          aria-label={label}
        >
          {children}
        </div>
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
    <div
      ref={outer}
      className={cn("w-full overflow-x-hidden overflow-y-auto overscroll-contain [contain:inline-size]", height)}
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <div className="overflow-hidden" style={{ height: contentHeight === null ? undefined : contentHeight * scale }}>
        <div ref={inner} style={{ width: DESKTOP_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
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
