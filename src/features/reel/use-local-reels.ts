"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteReelExport, listReelDrafts, listReelExports, type ReelDraftSummary, type ReelExportMeta } from "./reel-library";
import { clearReelProject } from "./storage";

/** The reels kept in this browser: finished videos and drafts still being edited. */
export function useLocalReels() {
  const [exports, setExports] = useState<ReelExportMeta[]>([]);
  const [drafts, setDrafts] = useState<ReelDraftSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listReelExports()
      .catch(() => {
        if (!cancelled) setUnavailable(true);
        return [] as ReelExportMeta[];
      })
      .then((list) => {
        if (cancelled) return;
        setExports(list);
        setDrafts(listReelDrafts());
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const removeExport = useCallback(async (id: string) => {
    await deleteReelExport(id);
    setExports((list) => list.filter((e) => e.id !== id));
  }, []);

  const removeDraft = useCallback((tripId: string) => {
    clearReelProject(tripId);
    setDrafts((list) => list.filter((d) => d.tripId !== tripId));
  }, []);

  return { exports, drafts, loaded, unavailable, removeExport, removeDraft };
}
