"use client";

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ReadinessItem } from "@/features/editor/readiness";

/** Tries to load each image URL and reports how many fail. */
export function useImageProbe(urls: string[], active: boolean): { checking: boolean; failed: number } {
  const key = urls.join("\n");
  // The result is tagged with the URLs it was measured for, so it never shows stale numbers.
  const [result, setResult] = useState<{ key: string; failed: number } | null>(null);
  const enabled = active && urls.length > 0;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all(
      key.split("\n").map(
        (url) =>
          new Promise<boolean>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
          }),
      ),
    ).then((results) => {
      if (!cancelled) setResult({ key, failed: results.filter((ok) => !ok).length });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  if (!enabled) return { checking: false, failed: 0 };
  return result?.key === key ? { checking: false, failed: result.failed } : { checking: true, failed: 0 };
}

/**
 * Pre-flight checklist shown before publishing or printing, so nothing goes
 * out with missing details or photos that haven't loaded.
 */
export function ReadinessChecklist({
  items,
  checking,
  total,
  className,
}: {
  items: ReadinessItem[];
  checking: boolean;
  /** Number of photos being checked, for the "all loaded" message */
  total: number;
  className?: string;
}) {
  const errors = items.filter((i) => i.severity === "error");
  const warnings = items.filter((i) => i.severity === "warning");

  return (
    <div className={cn("space-y-2 text-sm", className)} aria-live="polite">
      {checking ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden className="size-4 animate-spin" /> Checking that all {total} {total === 1 ? "photo has" : "photos have"} loaded…
        </p>
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 text-success">
          <CheckCircle2 aria-hidden className="size-4" /> All details and photos are loaded.
        </p>
      ) : null}
      {[...errors, ...warnings].map((item) => (
        <p key={item.message} className={cn("flex items-start gap-2", item.severity === "error" ? "text-destructive" : "text-foreground")}>
          {item.severity === "error" ? (
            <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          )}
          <span>{item.message}</span>
        </p>
      ))}
    </div>
  );
}
