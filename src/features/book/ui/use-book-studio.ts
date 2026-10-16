"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { commit, createHistory, redo as redoHistory, undo as undoHistory, type History } from "@/features/reel/history";
import { renderPageToCanvas } from "../canvas-render";
import { containRect } from "../image-fit";
import { makeShape, makeText, newId, roleStyle, scaleFor } from "../elements";
import { FAMILY_KEYS, FontStore, resolveFont, type ResolvedFont } from "../fonts";
import { BookImages } from "../images";
import { lintPage, summarize, type Issue } from "../lint";
import * as ops from "../ops";
import { exportPdf, PdfCancelled, PdfExportError, type PdfOptions, type PdfProgress } from "../pdf";
import { cachedRender } from "../render-cache";
import { deleteBook, deleteImage, duplicateBook, listBooks, loadBook, loadImages, saveBook, saveImage, type BookMeta, type StoredImage } from "../storage";
import { buildBook, getTemplate, refreshContents, syncFolios, THEMES, resolveTheme, TEMPLATES } from "../templates";
import type { BookBrief, BookElement, BookPage, BookProject, BookSettings, BookSource, BookTheme, ImageElement, PageKind, TextElement, TextRole } from "../types";
import { clamp, type Rect } from "../units";
import type { PageRender } from "../display-list";
import { projectGeometry } from "../display-list";

export type PanelKey = "templates" | "pages" | "uploads" | "photos" | "text" | "backgrounds" | "shapes" | "layouts" | "themes" | "print";

export interface BookSelection {
  pageId: string;
  elementId: string | null;
}

export interface BookView {
  spread: boolean;
  /** "fit" or a multiplier of the fitted size */
  zoom: number | "fit";
  bleed: boolean;
  margins: boolean;
  safe: boolean;
  grid: boolean;
  snap: boolean;
  rulers: boolean;
}

const DEFAULT_VIEW: BookView = { spread: false, zoom: "fit", bleed: true, margins: true, safe: false, grid: false, snap: true, rulers: false };
const VIEW_KEY = "tms:book:view:v1";
const EXPORT_KEY = "tms:book:export:v1";

export const DEFAULT_EXPORT: PdfOptions = { scope: "all", quality: "print", includeBleed: true, cropMarks: false, skipBrokenImages: false };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as object) } : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

export type SaveState = "saved" | "saving" | "dirty" | "error";

export type ExportUi =
  | { status: "idle" }
  | { status: "running"; progress: PdfProgress }
  | { status: "done"; url: string; filename: string; bytes: number; pageCount: number; warnings: string[]; sizes: { widthMm: number; heightMm: number }[]; scope: PdfOptions["scope"] }
  | { status: "error"; message: string; recoverable: boolean };

type Action =
  | { type: "update"; fn: (p: BookProject) => BookProject; key: string | null }
  | { type: "load"; project: BookProject }
  | { type: "silent"; project: BookProject }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: History<BookProject>, action: Action): History<BookProject> {
  switch (action.type) {
    case "update":
      return commit(state, action.fn(state.present), action.key);
    case "load":
      return createHistory(action.project);
    case "silent":
      // Replaces the current book without adding an undo step (used for the first automatic text fit).
      return { ...state, present: action.project };
    case "undo":
      return undoHistory(state);
    case "redo":
      return redoHistory(state);
  }
}

const subscribeNever = () => () => undefined;
export function useMounted(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

export interface BootData {
  project: BookProject;
  localImages: StoredImage[];
  restored: boolean;
}

function slug(s: string) {
  return (
    s
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "photo-book"
  );
}

export function useBookStudio(brief: BookBrief, boot: BootData) {
  const [images] = useState(() => new BookImages());
  const [fonts] = useState(() => new FontStore());
  const [history, dispatch] = useReducer(reducer, boot.project, createHistory);
  const [localSources, setLocalSources] = useState<BookSource[]>(() => {
    images.register(brief.sources);
    return boot.localImages.map((img) => images.addBlob(img.id, img.name, img.blob, img.width, img.height));
  });
  const [selection, setSelection] = useState<BookSelection>({ pageId: boot.project.pages[0]?.id ?? "", elementId: null });
  const [view, setViewState] = useState<BookView>(() => readJson(VIEW_KEY, DEFAULT_VIEW));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [fontsVersion, setFontsVersion] = useState(0);
  const [exportOptions, setExportOptionsState] = useState<PdfOptions>(() => readJson(EXPORT_KEY, DEFAULT_EXPORT));
  const [exportUi, setExportUi] = useState<ExportUi>({ status: "idle" });
  const [books, setBooks] = useState<BookMeta[]>([]);
  const exportAbort = useRef<AbortController | null>(null);
  const exportUrl = useRef<string | null>(null);
  const savedStamp = useRef(boot.project.updatedAt);
  const latest = useRef({ project: boot.project, localSources: [] as BookSource[] });

  const project = history.present;
  const sources = useMemo(() => [...brief.sources, ...localSources], [brief.sources, localSources]);
  const sizes = useMemo(() => new Map(sources.map((s) => [s.id, { width: s.width, height: s.height }])), [sources]);
  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);

  useEffect(() => {
    latest.current = { project, localSources };
  });

  // Photos from the memory, plus any the visitor added earlier on this device.
  useEffect(() => {
    // (Re)attach the photos; React may run this effect twice in development.
    images.revive();
    images.register(brief.sources);
    for (const img of boot.localImages) images.addBlob(img.id, img.name, img.blob, img.width, img.height);
    return () => {
      exportAbort.current?.abort();
      images.dispose();
      if (exportUrl.current) URL.revokeObjectURL(exportUrl.current);
    };
    // once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fonts used by the book: loaded once, then pages are laid out again with their real widths.
  const neededFonts = useMemo(() => {
    const map = new Map<string, ResolvedFont>();
    const add = (f: ResolvedFont) => map.set(f.file, f);
    const t = project.theme;
    for (const family of [t.headingFont, t.bodyFont, t.scriptFont, t.labelFont]) add(resolveFont(family, false, false));
    for (const page of project.pages) for (const el of page.elements) if (el.type === "text") add(resolveFont(el.style.font, el.style.bold, el.style.italic));
    return [...map.values()];
  }, [project.pages, project.theme]);
  const fontKey = neededFonts.map((f) => f.file).join(",");
  useEffect(() => {
    let cancelled = false;
    void Promise.all(neededFonts.map((f) => fonts.register(f))).then(() => {
      if (!cancelled) setFontsVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKey, fonts]);

  // A new book: shrink any text that does not fit, once the real font widths are known.
  useEffect(() => {
    if (!project.needsFit || fontsVersion === 0) return;
    dispatch({ type: "silent", project: ops.autoFitProject(project, fonts) });
  }, [project, fontsVersion, fonts]);

  // Photo previews finishing should redraw; image sizes never change after load.
  useEffect(() => images.onChange(() => undefined), [images]);

  const env = useMemo(() => ({ fonts, fontsVersion, sizes }), [fonts, fontsVersion, sizes]);
  const renderOf = useCallback((page: BookPage, index: number): PageRender => cachedRender(project, page, index, env), [project, env]);

  const deferred = useDeferredValue(project);
  const issues = useMemo<Issue[]>(() => {
    const out: Issue[] = [];
    deferred.pages.forEach((page, i) => out.push(...lintPage(deferred, page, i, cachedRender(deferred, page, i, env))));
    return out;
  }, [deferred, env]);
  const issueSummary = useMemo(() => summarize(issues), [issues]);

  // Keep the selection pointing at something real.
  const pageIndex = Math.max(0, project.pages.findIndex((p) => p.id === selection.pageId));
  const page = project.pages[pageIndex] ?? project.pages[0];
  const selectedElement = page?.elements.find((e) => e.id === selection.elementId) ?? null;

  // -- saving ------------------------------------------------------------------------------------------

  useEffect(() => {
    if (project.updatedAt === savedStamp.current) return;
    setSaveState("dirty");
    const id = setTimeout(() => {
      setSaveState("saving");
      saveBook(project)
        .then(() => {
          savedStamp.current = project.updatedAt;
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, 700);
    return () => clearTimeout(id);
  }, [project]);

  const saveNow = useCallback(async () => {
    setSaveState("saving");
    try {
      await saveBook(latest.current.project);
      savedStamp.current = latest.current.project.updatedAt;
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      toast.error("This browser wouldn't let the book be saved. Storage may be full or blocked.");
      return false;
    }
  }, []);

  // -- editing ----------------------------------------------------------------------------------------

  const update = useCallback((fn: (p: BookProject) => BookProject, key: string | null = null) => dispatch({ type: "update", fn, key }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  const setView = useCallback((patch: Partial<BookView>) => {
    setViewState((v) => {
      const next = { ...v, ...patch };
      writeJson(VIEW_KEY, next);
      return next;
    });
  }, []);
  const setExportOptions = useCallback((patch: Partial<PdfOptions>) => {
    setExportOptionsState((o) => {
      const next = { ...o, ...patch };
      writeJson(EXPORT_KEY, next);
      return next;
    });
  }, []);

  const goToPage = useCallback((index: number) => {
    const p = latest.current.project.pages[clamp(index, 0, latest.current.project.pages.length - 1)];
    if (p) setSelection({ pageId: p.id, elementId: null });
  }, []);
  const selectElement = useCallback((pageId: string, elementId: string | null) => setSelection({ pageId, elementId }), []);

  const rename = useCallback((title: string) => update((p) => ops.touch({ ...p, title }), "title"), [update]);

  const patchElement = useCallback(
    (pageId: string, elementId: string, patch: Partial<BookElement>, key: string | null = null) =>
      update((p) => ops.updateElement(p, pageId, elementId, patch as Partial<ImageElement>), key ?? `el:${elementId}`),
    [update],
  );

  /** Moves or resizes an element, keeping it inside the page. */
  const setFrame = useCallback(
    (pageId: string, elementId: string, frame: Rect, key: string | null = null) =>
      update((p) => {
        const pg = p.pages.find((x) => x.id === pageId);
        const el = pg?.elements.find((e) => e.id === elementId);
        if (!pg || !el) return p;
        const geom = projectGeometry(p);
        return ops.updateElement(p, pageId, elementId, { frame: ops.clampFrame(frame, ops.boundsFor(el, pg, geom)) } as Partial<ImageElement>);
      }, key ?? `frame:${elementId}`),
    [update],
  );

  const addPageAfter = useCallback(
    (layoutKey: string | null = "photo-only", kind: PageKind = "content") => {
      const cur = latest.current.project;
      const idx = cur.pages.findIndex((x) => x.id === selection.pageId) + 1;
      const res = ops.addPage(cur, idx, layoutKey, kind, sizes);
      if (res.project === cur) {
        toast.error("A book can have up to 200 pages.");
        return;
      }
      update(() => res.project);
      setSelection({ pageId: res.page.id, elementId: null });
    },
    [selection.pageId, sizes, update],
  );

  const duplicatePageById = useCallback(
    (pageId: string) => {
      const res = ops.duplicatePage(latest.current.project, pageId);
      if (!res.page) {
        toast.error("A book can have up to 200 pages.");
        return;
      }
      update(() => res.project);
      setSelection({ pageId: res.page.id, elementId: null });
    },
    [update],
  );

  const deletePageById = useCallback(
    (pageId: string) => {
      const cur = latest.current.project;
      const i = cur.pages.findIndex((p) => p.id === pageId);
      update((p) => ops.deletePage(p, pageId));
      const next = cur.pages[i + 1] ?? cur.pages[i - 1];
      if (next && selection.pageId === pageId) setSelection({ pageId: next.id, elementId: null });
    },
    [selection.pageId, update],
  );

  const movePageTo = useCallback((from: number, to: number) => update((p) => ops.movePage(p, from, to)), [update]);

  const changeLayout = useCallback(
    (pageId: string, layoutKey: string) => {
      const res = ops.setPageLayout(latest.current.project, pageId, layoutKey, sizes);
      update(() => res.project);
      setSelection({ pageId, elementId: null });
      if (res.unplaced > 0) toast.warning(`${res.unplaced} item${res.unplaced === 1 ? "" : "s"} didn't fit this layout and ${res.unplaced === 1 ? "is" : "are"} waiting in the page's "Not placed" list.`);
      else if (res.empty > 0) toast.message(`${res.empty} photo frame${res.empty === 1 ? " is" : "s are"} empty. Drag photos in from the Photos tab.`);
    },
    [sizes, update],
  );

  const setPageProps = useCallback(
    (pageId: string, fn: (p: BookPage) => BookPage, key: string | null = null) => update((p) => ops.updatePage(p, pageId, fn), key),
    [update],
  );

  const addText = useCallback(
    (role: TextRole, text = "") => {
      if (!page) return;
      const el = ops.newTextElement(latest.current.project, role, text || { title: "Your title", heading: "A heading", body: "Write your story here.", caption: "A caption", quote: "A memory worth keeping.", subtitle: "A subtitle", label: "Label", meta: "Details" }[role as string] || "Text");
      update((p) => ops.addElement(p, page.id, el));
      setSelection({ pageId: page.id, elementId: el.id });
    },
    [page, update],
  );

  const addShape = useCallback(
    (shape: "rect" | "ellipse" | "line") => {
      if (!page) return;
      const el = ops.newShapeElement(latest.current.project, shape);
      update((p) => ops.addElement(p, page.id, el));
      setSelection({ pageId: page.id, elementId: el.id });
    },
    [page, update],
  );

  /** Puts a photo on the page: into the selected frame, an empty frame, or a new frame. */
  const placeSource = useCallback(
    (sourceId: string, target?: { pageId?: string; elementId?: string }) => {
      const cur = latest.current.project;
      const pg = cur.pages.find((p) => p.id === (target?.pageId ?? selection.pageId));
      if (!pg) return;
      const src = sourceById.get(sourceId) ?? null;
      const wanted = target?.elementId ?? (selectedElement?.type === "image" && pg.id === page?.id ? selectedElement.id : null);
      const existing = pg.elements.find((e): e is ImageElement => e.type === "image" && e.id === wanted) ?? pg.elements.find((e): e is ImageElement => e.type === "image" && !e.sourceId);
      if (existing) {
        // A frame that hugs its photo re-fits to the new photo's proportions.
        const frame = src && existing.slot && existing.mode === "contain" ? containRect(existing.slot, src.width / src.height) : existing.frame;
        update((p) => ops.updateElement(p, pg.id, existing.id, { sourceId, alt: src?.caption || src?.name || "", frame } as Partial<ImageElement>));
        setSelection({ pageId: pg.id, elementId: existing.id });
        return;
      }
      const el = ops.newImageElement(cur, src);
      update((p) => ops.addElement(p, pg.id, el));
      setSelection({ pageId: pg.id, elementId: el.id });
    },
    [page?.id, selectedElement, selection.pageId, sourceById, update],
  );

  const deleteElement = useCallback(
    (pageId: string, elementId: string) => {
      update((p) => ops.removeElement(p, pageId, elementId));
      setSelection({ pageId, elementId: null });
    },
    [update],
  );

  const duplicateElementById = useCallback(
    (pageId: string, elementId: string) => {
      const res = ops.duplicateElement(latest.current.project, pageId, elementId);
      if (res.id) {
        update(() => res.project);
        setSelection({ pageId, elementId: res.id });
      }
    },
    [update],
  );

  // -- uploads -------------------------------------------------------------------------------------------

  const [importing, setImporting] = useState(false);
  const addFiles = useCallback(
    async (files: File[]) => {
      const list = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
      if (files.length - list.length > 0) toast.error(`${files.length - list.length} file${files.length - list.length === 1 ? " isn't an image and was" : "s aren't images and were"} skipped.`);
      if (!list.length) return [] as BookSource[];
      setImporting(true);
      const added: BookSource[] = [];
      try {
        for (const file of list) {
          try {
            const s = await images.addFile(file);
            const blob = await images.blob(s.id);
            await saveImage(latest.current.project.id, { id: s.id, name: s.name, width: s.width, height: s.height, blob }).catch(() => toast.warning("This browser couldn't keep a copy of the photo, so it won't be there if you reopen the book."));
            added.push(s);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : `${file.name} couldn't be added.`);
          }
        }
      } finally {
        setImporting(false);
      }
      if (added.length) {
        setLocalSources((l) => [...l, ...added]);
        toast.success(`${added.length} photo${added.length === 1 ? "" : "s"} added`);
      }
      return added;
    },
    [images],
  );

  const removeLocalSource = useCallback(
    (id: string) => {
      update((p) => {
        let next = p;
        for (const pg of p.pages) {
          for (const el of pg.elements) if (el.type === "image" && el.sourceId === id) next = ops.updateElement(next, pg.id, el.id, { sourceId: null } as Partial<ImageElement>);
          if (pg.background.imageId === id) next = ops.updatePage(next, pg.id, (x) => ({ ...x, background: { ...x.background, imageId: null } }));
        }
        return next;
      });
      images.removeLocal(id);
      setLocalSources((l) => l.filter((s) => s.id !== id));
      void deleteImage(latest.current.project.id, id).catch(() => undefined);
    },
    [images, update],
  );

  // -- projects --------------------------------------------------------------------------------------------

  const refreshBooks = useCallback(async () => {
    try {
      setBooks(await listBooks());
    } catch {
      setBooks([]);
    }
  }, []);

  const openProject = useCallback(
    async (id: string) => {
      await saveNow();
      const next = await loadBook(id);
      if (!next) {
        toast.error("That book couldn't be opened.");
        return;
      }
      for (const s of latest.current.localSources) images.removeLocal(s.id);
      const stored = await loadImages(id).catch(() => []);
      setLocalSources(stored.map((img) => images.addBlob(img.id, img.name, img.blob, img.width, img.height)));
      dispatch({ type: "load", project: next });
      savedStamp.current = next.updatedAt;
      setSaveState("saved");
      setSelection({ pageId: next.pages[0]?.id ?? "", elementId: null });
    },
    [images, saveNow],
  );

  /** Starts a new book from a template. The current book stays saved and can be reopened. */
  const startFromTemplate = useCallback(
    async (templateKey: string, themeKey?: string) => {
      const template = getTemplate(templateKey);
      if (!template) return;
      await saveNow();
      const all = [...brief.sources, ...latest.current.localSources];
      const next = buildBook(template, { ...brief, sources: all }, { themeKey, title: latest.current.project.title || brief.title });
      // The new book gets its own copy of the photos added from the device.
      for (const s of latest.current.localSources) {
        const blob = await images.blob(s.id).catch(() => null);
        if (blob) await saveImage(next.id, { id: s.id, name: s.name, width: s.width, height: s.height, blob }).catch(() => undefined);
      }
      dispatch({ type: "load", project: next });
      await saveBook(next).catch(() => undefined);
      savedStamp.current = next.updatedAt;
      setSaveState("saved");
      setSelection({ pageId: next.pages[0]?.id ?? "", elementId: null });
      toast.success(`${template.name} started`);
    },
    [brief, images, saveNow],
  );

  const duplicateProject = useCallback(async () => {
    await saveNow();
    const copy = await duplicateBook(latest.current.project.id);
    if (copy) {
      toast.success("Book duplicated");
      void refreshBooks();
    }
  }, [refreshBooks, saveNow]);

  const removeProject = useCallback(
    async (id: string) => {
      await deleteBook(id).catch(() => undefined);
      void refreshBooks();
      if (id === latest.current.project.id) {
        const rest = (await listBooks().catch(() => [])).filter((b) => b.id !== id);
        if (rest[0]) await openProject(rest[0].id);
        else await startFromTemplate(latest.current.project.templateKey);
      }
    },
    [openProject, refreshBooks, startFromTemplate],
  );

  const changeTheme = useCallback((themeKey: string) => update((p) => ops.applyTheme(p, resolveTheme(themeKey, brief))), [brief, update]);
  const changeSettings = useCallback((patch: Partial<BookSettings>) => update((p) => ops.applySettings(p, { ...p.settings, ...patch }, sizes)), [sizes, update]);
  const setTheme = useCallback((theme: BookTheme) => update((p) => ops.applyTheme(p, theme)), [update]);

  const resetPage = useCallback((pageId: string) => update((p) => ops.resetPageToLayout(p, pageId, sizes)), [sizes, update]);

  const rebuildContents = useCallback(() => update((p) => syncFolios(refreshContents(p))), [update]);

  // -- export ------------------------------------------------------------------------------------------------

  const revokeExport = useCallback(() => {
    if (exportUrl.current) {
      URL.revokeObjectURL(exportUrl.current);
      exportUrl.current = null;
    }
  }, []);

  const runExport = useCallback(
    async (opts: PdfOptions) => {
      if (exportAbort.current) return;
      revokeExport();
      const ac = new AbortController();
      exportAbort.current = ac;
      setExportUi({ status: "running", progress: { stage: "preparing", fraction: 0, message: "Getting ready" } });
      let last = 0;
      try {
        const cur = latest.current.project;
        const result = await exportPdf(cur, { fonts, images }, opts, (progress) => {
          const now = performance.now();
          if (progress.stage === "pages" && now - last < 100) return;
          last = now;
          setExportUi((s) => (s.status === "running" ? { status: "running", progress } : s));
        }, ac.signal);
        const blob = new Blob([result.bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        exportUrl.current = url;
        const suffix = opts.scope === "page" ? `-page-${(opts.pageIndex ?? 0) + 1}` : opts.scope === "spreads" ? "-spreads" : opts.scope === "cover-wrap" ? "-cover" : opts.quality === "share" ? "-compressed" : "";
        setExportUi({ status: "done", url, filename: `${slug(cur.title)}${suffix}.pdf`, bytes: blob.size, pageCount: result.pageCount, warnings: result.warnings, sizes: result.sizes, scope: opts.scope });
      } catch (e) {
        if (e instanceof PdfCancelled) setExportUi({ status: "idle" });
        else setExportUi({ status: "error", message: e instanceof Error ? e.message : "The PDF couldn't be created.", recoverable: e instanceof PdfExportError && e.recoverable });
      } finally {
        exportAbort.current = null;
      }
    },
    [fonts, images, revokeExport],
  );
  const cancelExport = useCallback(() => exportAbort.current?.abort(), []);
  const resetExport = useCallback(() => {
    revokeExport();
    setExportUi({ status: "idle" });
  }, [revokeExport]);

  const exportPng = useCallback(
    async (pageIdx: number, dpi: number, includeBleed: boolean) => {
      const cur = latest.current.project;
      const pg = cur.pages[pageIdx];
      if (!pg) return;
      const t = toast.loading("Preparing the image");
      try {
        await Promise.all(neededFonts.map((f) => fonts.register(f)));
        const render = cachedRender(cur, pg, pageIdx, env);
        const canvas = await renderPageToCanvas(render, images, dpi / 25.4, includeBleed);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
        if (!blob) throw new Error("This browser couldn't create the image.");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug(cur.title)}-page-${pageIdx + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        toast.success("Image downloaded", { id: t });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "The image couldn't be created.", { id: t });
      }
    },
    [env, fonts, images, neededFonts],
  );

  // Leaving the page mid-export would lose it.
  const exporting = exportUi.status === "running";
  useEffect(() => {
    if (!exporting && saveState === "saved") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [exporting, saveState]);

  return {
    brief,
    images,
    fonts,
    fontsVersion,
    project,
    page,
    pageIndex,
    selection,
    selectedElement,
    setSelection,
    selectElement,
    goToPage,
    sources,
    sourceById,
    localSources,
    importing,
    view,
    setView,
    saveState,
    saveNow,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    update,
    rename,
    renderOf,
    issues,
    issueSummary,
    patchElement,
    setFrame,
    addPageAfter,
    duplicatePageById,
    deletePageById,
    movePageTo,
    changeLayout,
    setPageProps,
    addText,
    addShape,
    placeSource,
    deleteElement,
    duplicateElementById,
    addFiles,
    removeLocalSource,
    books,
    refreshBooks,
    openProject,
    startFromTemplate,
    duplicateProject,
    removeProject,
    changeTheme,
    setTheme,
    changeSettings,
    resetPage,
    rebuildContents,
    exportOptions,
    setExportOptions,
    exportUi,
    runExport,
    cancelExport,
    resetExport,
    exportPng,
    restored: boot.restored,
  };
}

export type BookStudioApi = ReturnType<typeof useBookStudio>;

export { THEMES, TEMPLATES, makeShape, makeText, newId, roleStyle, scaleFor, FAMILY_KEYS };
export type { TextElement };
