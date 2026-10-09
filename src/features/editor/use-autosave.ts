"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export type SaveHandler = (key: string, patch: Record<string, unknown>) => Promise<{ ok: true } | { ok: false; error: string }>;

/**
 * Debounced autosave queue. Edits are merged per key (for example "trip" or
 * "photo:<id>") and flushed after a pause in typing. Failed patches are put
 * back in the queue, merged under any newer edits, so nothing is lost and a
 * retry sends the latest values.
 */
export function useAutosave({ save, delay = 1200, enabled = true }: { save: SaveHandler; delay?: number; enabled?: boolean }) {
  const queue = useRef(new Map<string, Record<string, unknown>>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef<Promise<boolean> | null>(null);
  const saveRef = useRef(save);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const runOnce = useCallback(async (): Promise<boolean> => {
    const batch = [...queue.current.entries()];
    queue.current.clear();
    if (batch.length === 0) return true;
    setStatus("saving");
    let failure: string | null = null;
    for (const [key, patch] of batch) {
      let result: Awaited<ReturnType<SaveHandler>>;
      try {
        result = await saveRef.current(key, patch);
      } catch {
        result = { ok: false, error: "You appear to be offline. We'll keep your changes here." };
      }
      if (!result.ok) {
        failure = result.error;
        queue.current.set(key, { ...patch, ...(queue.current.get(key) ?? {}) });
      }
    }
    if (failure) {
      setError(failure);
      setStatus("error");
      return false;
    }
    setError(null);
    setLastSavedAt(new Date());
    setStatus(queue.current.size > 0 ? "pending" : "saved");
    return true;
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!enabled) return queue.current.size === 0;
    while (running.current) await running.current;
    if (queue.current.size === 0) return true;
    running.current = runOnce();
    try {
      return await running.current;
    } finally {
      running.current = null;
    }
  }, [enabled, runOnce]);

  const schedule = useCallback(
    (key: string, patch: Record<string, unknown>) => {
      queue.current.set(key, { ...(queue.current.get(key) ?? {}), ...patch });
      if (!enabled) return;
      setStatus((s) => (s === "error" ? "error" : "pending"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush();
      }, delay);
    },
    [delay, enabled, flush],
  );

  const discard = useCallback((key: string) => {
    queue.current.delete(key);
  }, []);

  const hasPending = useCallback(() => queue.current.size > 0 || running.current !== null, []);

  // Save when the tab is hidden, so switching apps on mobile doesn't lose work.
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [enabled, flush]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { status, error, lastSavedAt, schedule, flush, discard, hasPending };
}
