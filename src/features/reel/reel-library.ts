import { cloudDeleteReelExport, cloudListReelExports, cloudSaveReelExport } from "./cloud";
import { isReelProject } from "./defaults";
import { totalDuration } from "./timeline";
import type { ReelProject } from "./types";

/*
 * The rendered video files are kept in this browser's own storage (IndexedDB) so they can be
 * played and downloaded again; they are never uploaded. The details of each finished reel (title,
 * size, length) are also saved to the signed-in user's account, so My memories lists them on every
 * device. On another device the video itself is not there, only its details.
 */

const DB_NAME = "tms-reels";
const STORE = "exports";
const KEEP_LATEST = 12;

export interface ReelExportMeta {
  id: string;
  tripId: string;
  tripTitle: string;
  title: string;
  filename: string;
  format: "mp4" | "webm";
  mime: string;
  width: number;
  height: number;
  durationMs: number;
  sizeBytes: number;
  createdAt: number;
  /** False when the details came from the account but the video was made on another device. */
  onThisDevice?: boolean;
}

interface Row {
  meta: ReelExportMeta;
  blob: Blob;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser can't keep reels."));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "meta.id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Couldn't open the reel library."));
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = work(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("The reel library failed."));
        };
      }),
  );
}

export async function listReelExports(): Promise<ReelExportMeta[]> {
  const rows = await run<Row[]>("readonly", (s) => s.getAll()).catch(() => [] as Row[]);
  const merged = new Map<string, ReelExportMeta>(rows.map((r) => [r.meta.id, { ...r.meta, onThisDevice: true }]));
  const remote = await cloudListReelExports().catch(() => [] as ReelExportMeta[]);
  const remoteIds = new Set(remote.map((m) => m.id));
  for (const m of remote) if (!merged.has(m.id)) merged.set(m.id, { ...m, onThisDevice: false });
  // Reels rendered here before accounts synced are sent up once.
  for (const r of rows) if (!remoteIds.has(r.meta.id)) void cloudSaveReelExport(r.meta).catch(() => undefined);
  return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getReelExportBlob(id: string): Promise<Blob | null> {
  const row = await run<Row | undefined>("readonly", (s) => s.get(id));
  return row?.blob ?? null;
}

export async function deleteReelExport(id: string): Promise<void> {
  void cloudDeleteReelExport(id).catch(() => undefined);
  await run("readwrite", (s) => s.delete(id)).catch(() => undefined);
}

export async function saveReelExport(meta: Omit<ReelExportMeta, "id" | "createdAt" | "sizeBytes">, blob: Blob): Promise<ReelExportMeta> {
  const full: ReelExportMeta = {
    ...meta,
    id: `reel_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    sizeBytes: blob.size,
  };
  await run("readwrite", (s) => s.put({ meta: full, blob } satisfies Row));
  void cloudSaveReelExport(full).catch(() => undefined);
  // Keep storage tidy: only the most recent reels are retained.
  const all = await listReelExports();
  for (const old of all.slice(KEEP_LATEST)) await deleteReelExport(old.id).catch(() => undefined);
  return full;
}

// -- reels still being worked on ----------------------------------------------

export interface ReelDraftSummary {
  tripId: string;
  title: string;
  clipCount: number;
  durationMs: number;
  presetKey: string;
}

const PROJECT_PREFIX = "tms:reel:v1:";

export function listReelDrafts(): ReelDraftSummary[] {
  const out: ReelDraftSummary[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(PROJECT_PREFIX)) continue;
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as { draft?: unknown; saved?: unknown } | null;
      const project = [parsed?.draft, parsed?.saved].find((p): p is ReelProject => isReelProject(p));
      if (!project || project.clips.length === 0) continue;
      out.push({
        tripId: key.slice(PROJECT_PREFIX.length),
        title: project.title,
        clipCount: project.clips.length,
        durationMs: totalDuration(project.clips),
        presetKey: project.presetKey,
      });
    }
  } catch {
    // storage unavailable
  }
  return out;
}
