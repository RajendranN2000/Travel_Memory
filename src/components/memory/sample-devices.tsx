"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Renders `children` at a real device width and scales the result to fit its box. */
function ScaledBox({ width, children, className }: { width: number; children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(el.clientWidth / width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={outer} className={cn("relative overflow-hidden [contain:inline-size]", className)} aria-hidden inert>
      <div className="pointer-events-none absolute top-0 left-0 origin-top-left" style={{ width, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

/**
 * A published memory shown the way visitors meet it: in a browser window with
 * the same page on a phone in front. Both are real renders of the template.
 */
export function SampleDevices({ slug, desktop, mobile, className }: { slug: string; desktop: ReactNode; mobile: ReactNode; className?: string }) {
  return (
    <div className={cn("relative min-w-0 pr-6 pb-14 sm:pr-10", className)}>
      <div className="overflow-hidden rounded-xl border border-paper/15 bg-paper/5 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3 border-b border-paper/10 bg-paper/5 px-4 py-2.5" aria-hidden>
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto flex min-w-0 max-w-sm flex-1 items-center justify-center gap-1.5 truncate rounded-md bg-paper/10 px-3 py-1 text-xs text-paper/70">
            <Lock className="size-3 shrink-0" />
            <span className="truncate">mytravelmemory.com/memory/{slug}</span>
          </span>
        </div>
        <ScaledBox width={1280} className="h-[17rem] sm:h-[25rem] lg:h-[28rem]">
          {desktop}
        </ScaledBox>
      </div>

      <div className="absolute right-0 bottom-0 w-[8.75rem] rotate-[3deg] rounded-[1.75rem] border border-white/15 bg-black p-1.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] sm:w-[11rem] sm:rounded-[2.1rem] sm:p-2">
        <div className="relative overflow-hidden rounded-[1.4rem] bg-white sm:rounded-[1.7rem]">
          <ScaledBox width={390} className="h-[16rem] sm:h-[21rem]">
            {mobile}
          </ScaledBox>
          <span aria-hidden className="absolute top-1.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-black/80 sm:top-2" />
        </div>
      </div>
    </div>
  );
}
