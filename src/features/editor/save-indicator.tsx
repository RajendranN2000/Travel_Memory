"use client";

import { AlertCircle, Check, CloudOff, Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "./use-autosave";

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function SaveIndicator({
  status,
  error,
  lastSavedAt,
  demo,
  onRetry,
}: {
  status: SaveStatus;
  error: string | null;
  lastSavedAt: Date | null;
  demo: boolean;
  onRetry: () => void;
}) {
  if (demo) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-warning" role="status">
        <CloudOff aria-hidden className="size-4" /> Demo · not saved
      </p>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-2" role="alert">
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle aria-hidden className="size-4 shrink-0" />
          <span className="max-w-[16rem] truncate" title={error ?? undefined}>
            {error ?? "Not saved"}
          </span>
        </p>
        <Button size="xs" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-live="polite">
      {status === "saving" ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" /> Saving…
        </>
      ) : status === "pending" ? (
        <>
          <PencilLine aria-hidden className="size-4" /> Unsaved changes
        </>
      ) : status === "saved" && lastSavedAt ? (
        <>
          <Check aria-hidden className="size-4 text-success" /> Saved at {time.format(lastSavedAt)}
        </>
      ) : (
        <>
          <Check aria-hidden className="size-4 text-success" /> All changes saved
        </>
      )}
    </p>
  );
}
