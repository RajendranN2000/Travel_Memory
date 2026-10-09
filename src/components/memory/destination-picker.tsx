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
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:text-foreground",
            )}
          >
            <span aria-hidden className="size-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: option.swatch }} />
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
