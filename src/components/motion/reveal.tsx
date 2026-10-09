import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades content up as it scrolls into view using a CSS scroll-driven
 * animation (see `.reveal` in globals.css). This is progressive enhancement:
 * browsers without scroll timelines, people who prefer reduced motion, and
 * visitors without JavaScript always see the content immediately.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  return (
    <Component className={cn("reveal", className)} style={{ "--reveal-delay": `${delay * 40}%` } as CSSProperties}>
      {children}
    </Component>
  );
}
