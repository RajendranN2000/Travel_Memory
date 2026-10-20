import { cloudDeleteReelProject, cloudPullReelProjects, cloudPushReelProject } from "./cloud";
import { isReelProject } from "./defaults";
import type { ReelProject } from "./types";

/*
 * Only the editing settings (order, timings, text, look) are stored: in this browser for speed, and
 * copied to the signed-in user's account so they follow them between devices. Photos, music and
 * finished videos are never written here.
 */

interface Stored {
  draft: ReelProject | null;
  saved: ReelProject | null;
  savedAt: string | null;
  /** ms since epoch of the last change, so the newest copy wins when devices sync. */
  updatedAt?: number;
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
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return { draft: null, saved: null, savedAt: null };
  }
}

function write(tripId: string, value: Stored, push = true): boolean {
  const next: Stored = { ...value, updatedAt: value.updatedAt || Date.now() };
  try {
    window.localStorage.setItem(key(tripId), JSON.stringify(next));
  } catch {
    return false;
  }
  if (push) pushSoon(tripId, next);
  return true;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
/** Autosave fires often; the account copy is updated once things settle. */
function pushSoon(tripId: string, value: Stored) {
  clearTimeout(timers.get(tripId));
  timers.set(
    tripId,
    setTimeout(() => {
      timers.delete(tripId);
      void cloudPushReelProject({ tripId, draft: value.draft, saved: value.saved, savedAt: value.savedAt, updatedAt: value.updatedAt || Date.now() }).catch(() => undefined);
    }, 1500),
  );
}

/**
 * Brings this browser in line with the account: newer account copies replace local ones, and local
 * projects the account has not seen are sent up. Call before reading projects.
 */
export async function syncReelProjects(): Promise<void> {
  try {
    const remote = await cloudPullReelProjects();
    const remoteByTrip = new Map(remote.map((r) => [r.tripId, r]));
    for (const r of remote) {
      const local = read(r.tripId);
      const has = local.draft || local.saved;
      if (!has || (local.updatedAt ?? 0) < r.updatedAt) {
        write(r.tripId, { draft: isReelProject(r.draft) ? r.draft : null, saved: isReelProject(r.saved) ? r.saved : null, savedAt: r.savedAt, updatedAt: r.updatedAt }, false);
      }
    }
    const prefix = "tms:reel:v1:";
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k?.startsWith(prefix)) continue;
      const tripId = k.slice(prefix.length);
      const local = read(tripId);
      const theirs = remoteByTrip.get(tripId);
      if ((local.draft || local.saved) && (!theirs || (local.updatedAt ?? 0) > theirs.updatedAt)) {
        void cloudPushReelProject({ tripId, draft: local.draft, saved: local.saved, savedAt: local.savedAt, updatedAt: local.updatedAt || Date.now() }).catch(() => undefined);
      }
    }
  } catch {
    // Offline or signed out: the local copy still works.
  }
}

export function loadReelProject(tripId: string): { project: ReelProject | null; saved: ReelProject | null; savedAt: string | null } {
  const stored = read(tripId);
  return { project: stored.draft ?? stored.saved, saved: stored.saved, savedAt: stored.savedAt };
}

/** Quiet background save of the working copy. */
export function autosaveReelProject(tripId: string, project: ReelProject): boolean {
  const stored = read(tripId);
  return write(tripId, { ...stored, draft: project, updatedAt: Date.now() });
}

/** Explicit "Save project settings". */
export function saveReelProject(tripId: string, project: ReelProject): { ok: boolean; savedAt: string } {
  const savedAt = new Date().toISOString();
  const ok = write(tripId, { draft: project, saved: project, savedAt, updatedAt: Date.now() });
  return { ok, savedAt };
}

export function clearReelProject(tripId: string) {
  void cloudDeleteReelProject(tripId).catch(() => undefined);
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
