"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({ title, children, className, action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("space-y-3 border-b border-border px-4 py-4 last:border-b-0", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, value, children, htmlFor }: { label: string; value?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <label htmlFor={htmlFor} className="text-foreground/90">
          {label}
        </label>
        {value !== undefined ? <span className="text-xs text-muted-foreground tabular-nums">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** Styled native range input: keyboard and screen-reader friendly everywhere. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
}) {
  const id = useId();
  const span = max - min || 1;
  const fill = Math.min(100, Math.max(0, ((value - min) / span) * 100));
  return (
    <Field label={label} value={format ? format(value) : String(value)} htmlFor={id}>
      <input
        id={id}
        type="range"
        className="reel-range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        disabled={disabled}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function NativeSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  columns,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; hint?: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1.5">
      <p className="text-sm text-foreground/90">{label}</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={o.disabled}
              title={o.hint}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-10 rounded-lg border px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
                active ? "border-primary bg-primary/15 text-foreground" : "border-input bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Tile({
  active,
  onClick,
  children,
  className,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-xs transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "border-primary bg-primary/15 text-foreground" : "border-input bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
