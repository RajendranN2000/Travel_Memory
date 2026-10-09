import { cn } from "@/lib/utils";
import type { MemoryContent } from "@/features/memories/types";
import { MemoryRenderer } from "@/features/templates/render";

/**
 * A live, non-interactive miniature of a memory. The template renders at the
 * card's real width, so container queries show its small-screen layout.
 */
export function TemplateThumbnail({
  memory,
  className,
  height = "h-[26rem]",
}: {
  memory: MemoryContent;
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg border border-border bg-card", height, className)}
      aria-hidden
      inert
    >
      <div className="pointer-events-none select-none">
        <MemoryRenderer memory={memory} sizesHint="thumb" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent" />
    </div>
  );
}
