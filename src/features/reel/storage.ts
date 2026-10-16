import { isReelProject } from "./defaults";
import type { ReelProject } from "./types";

/*
 * Only the editing settings (order, timings, text, look) are stored, and only
 * in this browser. Photos, music and finished videos are never written here.
 */

interface Stored {
  draft: ReelProject | null;
  saved: ReelProject | null;
  savedAt: string | null;
}

const key = (tripId: string) => `tms:reel:v1:${tripId}`;

function read(tripId: string): Stored {
  try {
    const raw = window.localStorage.getItem(key(tripId));
    if (!raw) return { draft: null, saved: null, savedAt: null };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      draft: isReelProject(parsed.draft) ? parsed.draft : null,
      saved: isReelProject(parsed.saved) ? parsed.saved : null,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : null,
    };
  } catch {
    return { draft: null, saved: null, savedAt: null };
  }
}

function write(tripId: string, value: Stored): boolean {
  try {
    window.localStorage.setItem(key(tripId), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadReelProject(tripId: string): { project: ReelProject | null; saved: ReelProject | null; savedAt: string | null } {
  const stored = read(tripId);
  return { project: stored.draft ?? stored.saved, saved: stored.saved, savedAt: stored.savedAt };
}

/** Quiet background save of the working copy. */
export function autosaveReelProject(tripId: string, project: ReelProject): boolean {
  const stored = read(tripId);
  return write(tripId, { ...stored, draft: project });
}

/** Explicit "Save project settings". */
export function saveReelProject(tripId: string, project: ReelProject): { ok: boolean; savedAt: string } {
  const savedAt = new Date().toISOString();
  const ok = write(tripId, { draft: project, saved: project, savedAt });
  return { ok, savedAt };
}

export function clearReelProject(tripId: string) {
  try {
    window.localStorage.removeItem(key(tripId));
  } catch {
    // storage unavailable
  }
}

/** Preview quality and the safe-area toggle are per-viewer conveniences. */
const PREFS_KEY = "tms:reel:prefs:v1";
export interface ReelPrefs {
  previewQuality: "low" | "medium" | "high";
  safeArea: boolean;
}
export function loadPrefs(): ReelPrefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<ReelPrefs>;
    return {
      previewQuality: raw.previewQuality === "low" || raw.previewQuality === "high" ? raw.previewQuality : "medium",
      safeArea: raw.safeArea === true,
    };
  } catch {
    return { previewQuality: "medium", safeArea: false };
  }
}
export function savePrefs(prefs: ReelPrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable
  }
}
