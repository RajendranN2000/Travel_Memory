"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const RADIUS = 21;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A round button with a progress ring that appears after scrolling and takes the visitor back to the top. */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let max = 0;
    let frame = 0;
    // Page height is measured when the page's size changes, never inside the scroll handler.
    const measure = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
    };
    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      setVisible(y > 600);
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const observer = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    observer.observe(document.body);
    measure();
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "group fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 grid size-12 place-items-center rounded-full bg-card text-brand shadow-lifted outline-none ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:bg-gradient-to-br hover:from-[#d9552b] hover:to-[#f2a93b] hover:text-white hover:shadow-[0_14px_30px_-8px_rgba(217,85,43,0.7)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none sm:right-6 sm:bottom-6",
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-90 opacity-0",
      )}
    >
      {/* scroll progress ring */}
      <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="2.5" className="stroke-border" />
        <circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-brand transition-[stroke-dashoffset] duration-150 group-hover:stroke-white"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <ArrowUp aria-hidden className="relative size-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
    </button>
  );
}
