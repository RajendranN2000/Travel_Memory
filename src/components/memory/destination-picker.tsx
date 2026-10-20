"use client";

import { cn } from "@/lib/utils";

export interface DestinationOption {
  slug: string;
  name: string;
  swatch: string;
}

/** A row of toggle chips for switching the destination theme of a preview. */
export function DestinationChips({
  options,
  value,
  onChange,
  label = "Destination theme",
  className,
}: {
  options: DestinationOption[];
  value: string;
  onChange: (slug: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = option.slug === value;
        return (
          <button
            key={option.slug}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.slug)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-300 active:scale-[0.97]",
              active
                ? "border-transparent bg-gradient-to-r from-[#d9552b] via-[#e8742f] to-[#f2a93b] text-white shadow-[0_8px_20px_-8px_rgba(217,85,43,0.65)]"
                : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-sm",
            )}
          >
            <span aria-hidden className={cn("size-3.5 rounded-full ring-2", active ? "ring-white/80" : "ring-black/10")} style={{ backgroundColor: option.swatch }} />
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
