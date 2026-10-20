import { cloudDeleteBook, cloudDeleteImage, cloudLatestForTrip, cloudListBooks, cloudLoadBook, cloudLoadImages, cloudSaveBook, cloudSaveImage } from "./cloud";
import { newId } from "./elements";
import type { BookProject } from "./types";

/*
 * Book projects live in this browser's IndexedDB: the page layouts and text, plus any
 * photos the user added from their device (so a book can be reopened and edited).
 * Photos that come from a memory are fetched again from that memory when needed.
 * A copy of each book (and its device photos) is also kept in the signed-in user's account (see cloud.ts),
 * so books follow them between devices; this IndexedDB store is the fast, offline working copy.
 */

const DB_NAME = "tms-books";
const DB_VERSION = 1;
const PROJECTS = "projects";
const IMAGES = "images";

export interface BookMeta {
  id: string;
  tripId: string;
  title: string;
  templateKey: string;
  kind: BookProject["kind"];
  pageCount: number;
  widthMm: number;
  heightMm: number;
  updatedAt: number;
}

interface ProjectRow extends BookMeta {
  project: BookProject;
}

export interface StoredImage {
  key: string;
  projectId: string;
  id: string;
  name: string;
  width: number;
  height: number;
  blob: Blob;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser can't keep books."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(IMAGES)) {
        const store = db.createObjectStore(IMAGES, { keyPath: "key" });
        store.createIndex("projectId", "projectId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Couldn't open the book library."));
  });
}

async function tx<T>(stores: string[], mode: IDBTransactionMode, work: (t: IDBTransaction) => IDBRequest<T> | Promise<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result: T;
    const r = work(t);
    if (r instanceof Promise) r.then((v) => (result = v), reject);
    else r.onsuccess = () => (result = r.result);
    t.oncomplete = () => {
      db.close();
      resolve(result);
    };
    t.onerror = t.onabort = () => {
      db.close();
      reject(t.error ?? new Error("The book library failed."));
    };
  });
}

const toMeta = (p: BookProject): BookMeta => ({
  id: p.id,
  tripId: p.tripId,
  title: p.title,
  templateKey: p.templateKey,
  kind: p.kind,
  pageCount: p.pages.length,
  widthMm: p.settings.widthMm,
  heightMm: p.settings.heightMm,
  updatedAt: p.updatedAt,
});

const rowMeta = (r: ProjectRow): BookMeta => ({ id: r.id, tripId: r.tripId, title: r.title, templateKey: r.templateKey, kind: r.kind, pageCount: r.pageCount, widthMm: r.widthMm, heightMm: r.heightMm, updatedAt: r.updatedAt });

export async function saveBook(project: BookProject): Promise<void> {
  const row: ProjectRow = { ...toMeta(project), project };
  await tx([PROJECTS], "readwrite", (t) => t.objectStore(PROJECTS).put(row));
  void cloudSaveBook(project).catch(() => undefined);
}

/** Puts a copy fetched from the account into the local store without pushing it back up. */
async function cacheBook(project: BookProject): Promise<void> {
  const row: ProjectRow = { ...toMeta(project), project };
  await tx([PROJECTS], "readwrite", (t) => t.objectStore(PROJECTS).put(row)).catch(() => undefined);
}

export async function loadBook(id: string): Promise<BookProject | null> {
  const row = await tx<ProjectRow | undefined>([PROJECTS], "readonly", (t) => t.objectStore(PROJECTS).get(id));
  if (row?.project) return row.project;
  const remote = await cloudLoadBook(id).catch(() => null);
  if (remote) await cacheBook(remote);
  return remote;
}

/**
 * Only books the user has actually worked on are listed. A book that was merely opened from a
 * template (never edited, so updatedAt still equals createdAt) is a template preview, not a
 * creation, so it is removed instead of cluttering My memories.
 */
export async function listBooks(): Promise<BookMeta[]> {
  const rows = await tx<ProjectRow[]>([PROJECTS], "readonly", (t) => t.objectStore(PROJECTS).getAll());
  const untouched = rows.filter((r) => r.project.updatedAt <= r.project.createdAt);
  await Promise.all(untouched.map((r) => deleteBook(r.id).catch(() => undefined)));
  const gone = new Set(untouched.map((r) => r.id));
  const local = new Map(rows.filter((r) => !gone.has(r.id)).map((r) => [r.id, rowMeta(r)]));

  // Merge with the account: the newest copy wins, books only on one side are carried to the other.
  const remote = await cloudListBooks().catch(() => null);
  if (remote) {
    const remoteById = new Map(remote.map((m) => [m.id, m]));
    for (const m of remote) {
      const mine = local.get(m.id);
      if (!mine) local.set(m.id, m);
      else if (m.updatedAt > mine.updatedAt) {
        const full = await cloudLoadBook(m.id).catch(() => null);
        if (full) {
          await cacheBook(full);
          local.set(m.id, m);
        }
      }
    }
    for (const r of rows) {
      if (gone.has(r.id)) continue;
      const theirs = remoteById.get(r.id);
      if (!theirs || r.updatedAt > theirs.updatedAt) {
        void cloudSaveBook(r.project).catch(() => undefined);
        for (const img of await loadLocalImages(r.id)) void cloudSaveImage(r.id, img).catch(() => undefined);
      }
    }
  }
  return [...local.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function latestBookForTrip(tripId: string): Promise<BookProject | null> {
  const rows = await tx<ProjectRow[]>([PROJECTS], "readonly", (t) => t.objectStore(PROJECTS).getAll());
  const mine = rows.filter((r) => r.tripId === tripId).sort((a, b) => b.updatedAt - a.updatedAt);
  if (mine[0]) return mine[0].project;
  const remote = await cloudLatestForTrip(tripId).catch(() => null);
  if (remote) await cacheBook(remote);
  return remote;
}

export async function deleteBook(id: string): Promise<void> {
  await cloudDeleteBook(id).catch(() => undefined);
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([PROJECTS, IMAGES], "readwrite");
    t.objectStore(PROJECTS).delete(id);
    const index = t.objectStore(IMAGES).index("projectId");
    const cursor = index.openKeyCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        t.objectStore(IMAGES).delete(c.primaryKey);
        c.continue();
      }
    };
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = t.onabort = () => {
      db.close();
      reject(t.error);
    };
  });
}

export async function saveImage(projectId: string, image: { id: string; name: string; width: number; height: number; blob: Blob }): Promise<void> {
  const row: StoredImage = { key: `${projectId}:${image.id}`, projectId, ...image };
  await tx([IMAGES], "readwrite", (t) => t.objectStore(IMAGES).put(row));
  void cloudSaveImage(projectId, image).catch(() => undefined);
}

export async function deleteImage(projectId: string, id: string): Promise<void> {
  await tx([IMAGES], "readwrite", (t) => t.objectStore(IMAGES).delete(`${projectId}:${id}`));
  void cloudDeleteImage(projectId, id).catch(() => undefined);
}

async function loadLocalImages(projectId: string): Promise<StoredImage[]> {
  return tx<StoredImage[]>([IMAGES], "readonly", (t) => t.objectStore(IMAGES).index("projectId").getAll(IDBKeyRange.only(projectId)));
}

export async function loadImages(projectId: string): Promise<StoredImage[]> {
  const local = await loadLocalImages(projectId);
  const have = new Set(local.map((i) => i.id));
  const remote = await cloudLoadImages(projectId).catch(() => []);
  for (const img of remote) {
    if (have.has(img.id)) continue;
    await tx([IMAGES], "readwrite", (t) => t.objectStore(IMAGES).put(img)).catch(() => undefined);
    local.push(img);
  }
  return local;
}

/** A copy of a book, with its own id and its own copy of the photos added from the device. */
export async function duplicateBook(id: string, title?: string): Promise<BookProject | null> {
  const project = await loadBook(id);
  if (!project) return null;
  const now = Date.now();
  const copy: BookProject = { ...project, id: newId("book"), title: title ?? `${project.title} (copy)`, createdAt: now, updatedAt: now + 1 };
  await saveBook(copy);
  for (const img of await loadImages(id)) await saveImage(copy.id, img);
  return copy;
}

/** Keeps the page-by-page project JSON small enough to autosave comfortably. */
export function projectBytes(project: BookProject): number {
  return JSON.stringify(project).length;
}
