"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { isHeic } from "@/features/editor/upload-validation";
import { AudioEngine, type LoadedTrack } from "../audio-engine";
import { detectBrowserEnv, detectCapabilities, type FormatOption } from "../capabilities";
import { clamp, LIMITS, outputSize, previewSize } from "../config";
import { baseOverlay, buildProject, DEFAULT_MUSIC, makeClip, reconcileProject } from "../defaults";
import { ExportCancelled, exportReel, type ExportProgress, type ExportResult } from "../exporter";
import { familyMap, fontsUsed, loadProjectFonts } from "../fonts";
import { commit, createHistory, redo as redoHistory, undo as undoHistory, type History } from "../history";
import { MediaLibrary } from "../media-library";
import { saveReelExport } from "../reel-library";
import { ReelPlayer } from "../player";
import { getPreset } from "../presets";
import { FrameRenderer } from "../renderer";
import { buildScene, neededSources } from "../scene";
import { autosaveReelProject, clearReelProject, loadPrefs, loadReelProject, savePrefs, saveReelProject, type ReelPrefs } from "../storage";
import {
  dropOverlaysOfClip,
  duplicateClip,
  layoutClips,
  newId,
  placeOverlay,
  removeClip,
  reorderClips,
  setClipDuration,
  snapClipsToBeat,
  usageBySource,
} from "../timeline";
import type { Clip, MusicSettings, ReelProject, ReelSource, ReelTripBrief, TextKind, TextOverlay } from "../types";
import { snapBounds } from "./safe-area";

export type Selection = { type: "clip"; id: string } | { type: "text"; id: string } | { type: "music" } | null;
export type PanelKey = "media" | "music" | "transitions" | "effects" | "text" | "templates" | "settings";

export type ExportUi =
  | { status: "idle"; cancelled?: boolean }
  | { status: "running"; progress: ExportProgress }
  | { status: "done"; result: ExportResult; url: string; filename: string }
  | { status: "error"; message: string };

type Action =
  | { type: "update"; fn: (p: ReelProject) => ReelProject; key: string | null }
  | { type: "replace"; project: ReelProject }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: History<ReelProject>, action: Action): History<ReelProject> {
  switch (action.type) {
    case "update":
      return commit(state, action.fn(state.present), action.key);
    case "replace":
      return commit(state, action.project, null);
    case "undo":
      return undoHistory(state);
    case "redo":
      return redoHistory(state);
  }
}

interface Initial {
  project: ReelProject;
  savedJson: string;
  restored: boolean;
  dropped: number;
}

function initialState(brief: ReelTripBrief): Initial {
  const stored = loadReelProject(brief.tripId);
  let project = stored.project;
  let dropped = 0;
  let restored = false;
  if (project) {
    const rec = reconcileProject(project, brief.sources);
    project = rec.project;
    dropped = rec.dropped;
    restored = project.clips.length > 0;
  }
  if (!project || project.clips.length === 0) project = buildProject(brief);
  const saved = stored.saved ? reconcileProject(stored.saved, brief.sources).project : project;
  return { project, savedJson: JSON.stringify(saved), restored, dropped };
}

const subscribeNever = () => () => undefined;
/** True once running in the browser; false during server render and hydration. */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

/** Playhead time in tenths of a second. Re-renders about 10 times a second while playing, never per frame. */
export function useTenths(player: ReelPlayer): number {
  return useSyncExternalStore(
    (cb) => player.subscribeTime(cb),
    () => Math.floor(player.time / 100),
    () => 0,
  );
}

export function usePlaying(player: ReelPlayer): boolean {
  return useSyncExternalStore(
    (cb) => player.subscribeState(cb),
    () => player.isPlaying,
    () => false,
  );
}

export function useReelStudio(brief: ReelTripBrief) {
  const [library] = useState(() => new MediaLibrary(8));
  const [audio] = useState(() => new AudioEngine());
  const [init] = useState(() => initialState(brief));
  const [history, dispatch] = useReducer(reducer, init.project, createHistory);
  const [sources, setSources] = useState<ReelSource[]>(brief.sources);
  const [prefs, setPrefs] = useState<ReelPrefs>(() => loadPrefs());
  const [selection, setSelection] = useState<Selection>(null);
  const [track, setTrack] = useState<LoadedTrack | null>(null);
  const [trackPlaying, setTrackPlaying] = useState(false);
  const [savedJson, setSavedJson] = useState(init.savedJson);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [exportUi, setExportUi] = useState<ExportUi>({ status: "idle" });
  const [importing, setImporting] = useState(false);
  const [kept, setKept] = useState<boolean | null>(null);

  const project = history.present;
  const slots = useMemo(() => layoutClips(project.clips), [project.clips]);
  const totalMs = slots.length ? slots[slots.length - 1].endMs : 0;
  const preview = useMemo(() => previewSize(project.aspect, prefs.previewQuality), [project.aspect, prefs.previewQuality]);
  const capabilities = useMemo(() => detectCapabilities(detectBrowserEnv()), []);

  // Fonts: resolve CSS families for the canvas and wait for the files to load.
  const fontKeys = fontsUsed(project).sort().join(",");
  const families = useMemo(() => familyMap(fontKeys ? (fontKeys.split(",") as Parameters<typeof familyMap>[0]) : []), [fontKeys]);
  const scene = useMemo(() => buildScene(project, (id) => library.get(id), families), [project, families, library]);

  const latest = useRef({ project, scene, totalMs, sources, preview });
  useEffect(() => {
    latest.current = { project, scene, totalMs, sources, preview };
  });
  const rendererRef = useRef<FrameRenderer | null>(null);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const setCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasEl.current = el;
    setCanvasVersion((v) => v + 1);
  }, []);
  const exportAbort = useRef<AbortController | null>(null);
  const exportUrl = useRef<string | null>(null);
  const exportingRef = useRef(false);
  const lastProgressAt = useRef(0);
  const trackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- player --------------------------------------------------------------

  const playerRef = useRef<ReelPlayer | null>(null);

  const ensureAround = useCallback(
    (t: number) => {
      const { scene: sc } = latest.current;
      const { now, ahead } = neededSources(sc, t);
      const missing = now.filter((id) => !library.has(id));
      if (missing.length) setBusy(true);
      void library.ensure(now, ahead).then(() => {
        if (missing.length) {
          setBusy(false);
          playerRef.current?.redraw();
        }
        const errors: Record<string, string> = {};
        for (const id of [...now, ...ahead]) {
          const e = library.errorFor(id);
          if (e) errors[id] = e;
        }
        setLoadErrors((prev) => (Object.keys(errors).length === 0 && Object.keys(prev).length === 0 ? prev : { ...prev, ...errors }));
      });
    },
    [library],
  );

  const [player] = useState(
    () =>
      new ReelPlayer({
        draw: () => undefined,
        totalMs: () => 0,
        onStart: () => undefined,
        onStop: () => undefined,
        prefetch: () => undefined,
        fps: () => 30,
      }),
  );
  useEffect(() => {
    player.setHooks({
      draw: (t) => rendererRef.current?.render(t, Math.min(30, latest.current.project.fps)),
      totalMs: () => latest.current.totalMs,
      onStart: (t) => {
        void audio.start(t, latest.current.project.music, latest.current.totalMs);
        ensureAround(t);
      },
      onStop: () => audio.stop(),
      prefetch: (t) => ensureAround(t),
      fps: () => Math.min(30, latest.current.project.fps),
    });
    playerRef.current = player;
  }, [player, audio, ensureAround]);

  // Lifecycle: free every decoder, audio node, frame request and object URL on close.
  useEffect(() => {
    library.revive();
    library.register(latest.current.sources);
    return () => {
      exportAbort.current?.abort();
      player.dispose();
      library.dispose();
      audio.dispose();
      if (exportUrl.current) URL.revokeObjectURL(exportUrl.current);
      if (trackTimer.current) clearTimeout(trackTimer.current);
    };
  }, [library, audio, player]);

  // Canvas size and renderer.
  useEffect(() => {
    const canvas = canvasEl.current;
    if (!canvas || exportingRef.current) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
    library.setFrame(preview.width, preview.height);
    rendererRef.current = new FrameRenderer(canvas, latest.current.scene);
    ensureAround(player.time);
    player.redraw();
    return () => {
      rendererRef.current = null;
    };
    // canvasVersion changes when the canvas element mounts or is replaced.
  }, [canvasVersion, preview.width, preview.height, library, player, ensureAround]);

  useEffect(() => {
    rendererRef.current?.setScene(scene);
    player.clampToTotal();
    player.redraw();
    ensureAround(player.time);
  }, [scene, player, ensureAround]);

  useEffect(() => {
    let cancelled = false;
    void loadProjectFonts(project).then(() => {
      if (!cancelled) player.redraw();
    });
    return () => {
      cancelled = true;
    };
    // Only when the set of fonts or the text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKeys, project.overlays.map((o) => o.text).join("|"), player]);

  // Music or length changed while playing: restart the sound with the new envelope.
  useEffect(() => {
    player.resync();
  }, [project.music, totalMs, player]);

  // Keep the photo bytes coming in the background.
  useEffect(() => {
    library.warm(project.clips.map((c) => c.sourceId));
  }, [project.clips, library]);

  // Playback and exports stop being meaningful when the tab is hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") player.pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [player]);

  // Quiet autosave of the editing settings (never the photos, music or video).
  useEffect(() => {
    const id = setTimeout(() => {
      autosaveReelProject(brief.tripId, project);
    }, 500);
    return () => clearTimeout(id);
  }, [project, brief.tripId]);

  const dirty = useMemo(() => JSON.stringify(project) !== savedJson, [project, savedJson]);

  // -- editing -------------------------------------------------------------

  const update = useCallback((fn: (p: ReelProject) => ReelProject, key: string | null = null) => dispatch({ type: "update", fn, key }), []);
  const patch = useCallback((partial: Partial<ReelProject>, key: string | null = null) => update((p) => ({ ...p, ...partial }), key), [update]);

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  const patchClip = useCallback(
    (id: string, partial: Partial<Omit<Clip, "id">>, key: string | null = null) =>
      update((p) => ({ ...p, clips: p.clips.map((c) => (c.id === id ? { ...c, ...partial } : c)) }), key),
    [update],
  );
  const setDuration = useCallback(
    (id: string, ms: number) => update((p) => ({ ...p, clips: setClipDuration(p.clips, id, ms) }), `dur:${id}`),
    [update],
  );
  const moveClip = useCallback((from: number, to: number) => update((p) => ({ ...p, clips: reorderClips(p.clips, from, to) })), [update]);
  const duplicate = useCallback(
    (id: string) => {
      const res = duplicateClip(latest.current.project.clips, id);
      if (!res.newId) {
        toast.error(`A reel can have up to ${LIMITS.maxClips} clips.`);
        return;
      }
      update((p) => ({ ...p, clips: duplicateClip(p.clips, id).clips }));
      setSelection({ type: "clip", id: res.newId });
    },
    [update],
  );
  const deleteClip = useCallback(
    (id: string) => {
      update((p) => ({ ...p, clips: removeClip(p.clips, id), overlays: dropOverlaysOfClip(p.overlays, id) }));
      setSelection((s) => (s?.type === "clip" && s.id === id ? null : s));
    },
    [update],
  );

  const patchOverlay = useCallback(
    (id: string, partial: Partial<Omit<TextOverlay, "id">>, key: string | null = null) =>
      update((p) => ({ ...p, overlays: p.overlays.map((o) => (o.id === id ? { ...o, ...partial } : o)) }), key ?? `text:${id}`),
    [update],
  );
  const moveOverlay = useCallback(
    (id: string, startMs: number, durationMs: number) =>
      update((p) => {
        const s = layoutClips(p.clips);
        const total = s.length ? s[s.length - 1].endMs : 0;
        return { ...p, overlays: p.overlays.map((o) => (o.id === id ? placeOverlay(o, startMs, durationMs, s, total) : o)) };
      }, `text-move:${id}`),
    [update],
  );
  const addOverlay = useCallback(
    (kind: TextKind) => {
      const { project: current, sources: srcs } = latest.current;
      const t = player.time;
      const theme = brief.theme;
      const titleLike = kind === "title" || kind === "closing";
      const bounds = snapBounds(current.aspect);
      const overlay = baseOverlay({
        kind,
        text:
          kind === "title"
            ? current.title
            : kind === "subtitle"
              ? theme.destinationName
              : kind === "location"
                ? srcs.find((s) => s.location)?.location || theme.destinationName
                : kind === "quote"
                  ? "Not all those who wander are lost."
                  : kind === "closing"
                    ? "Memories Forever"
                    : kind === "caption"
                      ? "A moment worth keeping"
                      : "Your text",
        anchor: kind === "closing" ? { type: "end" } : { type: "free" },
        offsetMs: kind === "closing" ? 300 : Math.round(clamp(t, 0, Math.max(0, totalMs - 1500))),
        durationMs: kind === "closing" ? 2600 : Math.min(2800, Math.max(LIMITS.minTextMs, totalMs || 2800)),
        font: titleLike || kind === "quote" ? theme.headingFont : theme.bodyFont,
        sizePct: titleLike ? 8 : kind === "quote" ? 4.6 : 3.4,
        weight: titleLike ? theme.headingWeight : 600,
        italic: kind === "quote",
        uppercase: kind === "location" || kind === "subtitle",
        tracking: kind === "location" || kind === "subtitle" ? 0.18 : 0,
        y: kind === "title" || kind === "closing" ? 0.42 : kind === "subtitle" ? 0.5 : bounds.lowerThird,
        animation: titleLike ? "rise" : "fade",
      });
      update((p) => ({ ...p, overlays: [...p.overlays, overlay] }));
      setSelection({ type: "text", id: overlay.id });
    },
    [update, player, brief.theme, totalMs],
  );
  const duplicateOverlay = useCallback(
    (id: string) => {
      const o = latest.current.project.overlays.find((x) => x.id === id);
      if (!o) return;
      const copy: TextOverlay = { ...o, id: newId("text"), offsetMs: o.offsetMs + 400, y: clamp(o.y + 0.06, 0.05, 0.95) };
      update((p) => ({ ...p, overlays: [...p.overlays, copy] }));
      setSelection({ type: "text", id: copy.id });
    },
    [update],
  );
  const deleteOverlay = useCallback(
    (id: string) => {
      update((p) => ({ ...p, overlays: p.overlays.filter((o) => o.id !== id) }));
      setSelection((s) => (s?.type === "text" && s.id === id ? null : s));
    },
    [update],
  );

  const setTransitionForAll = useCallback(
    (kind: Clip["transition"]["kind"] | null, durationMs: number | null) =>
      update(
        (p) => ({
          ...p,
          transitionMs: durationMs ?? p.transitionMs,
          clips: p.clips.map((c) => ({
            ...c,
            transition: { kind: kind ?? c.transition.kind, durationMs: durationMs ?? c.transition.durationMs },
          })),
        }),
        durationMs !== null && kind === null ? "transition-ms" : null,
      ),
    [update],
  );
  const setMotionForAll = useCallback(
    (motion: Clip["motion"]) => update((p) => ({ ...p, clips: p.clips.map((c) => ({ ...c, motion })) })),
    [update],
  );

  const setMusic = useCallback(
    (partial: Partial<MusicSettings>, key: string | null = null) => update((p) => ({ ...p, music: { ...p.music, ...partial } }), key ?? "music"),
    [update],
  );

  const applyPreset = useCallback(
    (presetKey: string) => {
      const p = latest.current.project;
      const next = buildProject(
        { ...brief, sources: latest.current.sources },
        { presetKey, sourceIds: p.clips.map((c) => c.sourceId), aspect: p.aspect, resolution: p.resolution, fps: p.fps, music: p.music },
      );
      dispatch({ type: "replace", project: { ...next, title: p.title } });
      setSelection(null);
      toast.success(`${getPreset(presetKey).name} applied`);
    },
    [brief],
  );

  /** Snap cut lengths to the music's beat so transitions land on the pulse. */
  const snapToBeat = useCallback(() => {
    if (!track?.beat) return;
    update((p) => ({ ...p, clips: snapClipsToBeat(p.clips, track.beat!.beatMs * 2, 1) }));
    toast.success(`Clips snapped to every 2nd beat (${track.beat.bpm} BPM)`);
  }, [track, update]);

  // -- media ---------------------------------------------------------------

  const usage = useMemo(() => usageBySource(project.clips), [project.clips]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/") || isHeic(f));
      const skipped = files.length - images.length;
      if (skipped > 0) toast.error(`${skipped} ${skipped === 1 ? "file isn't an image and was" : "files aren't images and were"} skipped.`);
      if (!images.length) return;
      setImporting(true);
      const added: ReelSource[] = [];
      try {
        for (const file of images) {
          if (latest.current.project.clips.length + added.length >= LIMITS.maxClips) {
            toast.error(`A reel can have up to ${LIMITS.maxClips} clips.`);
            break;
          }
          try {
            added.push(await library.addFile(file));
          } catch (e) {
            toast.error(e instanceof Error ? e.message : `${file.name} couldn't be added.`);
          }
        }
      } finally {
        setImporting(false);
      }
      if (!added.length) return;
      setSources((list) => [...list, ...added]);
      update((p) => {
        const preset = getPreset(p.presetKey);
        return { ...p, clips: [...p.clips, ...added.map((s, i) => makeClip(s, preset, p.clips.length + i))] };
      });
      toast.success(`${added.length} ${added.length === 1 ? "photo" : "photos"} added to the reel`);
    },
    [library, update],
  );

  const toggleSource = useCallback(
    (id: string) => {
      const used = latest.current.project.clips.some((c) => c.sourceId === id);
      if (used) {
        update((p) => {
          const gone = new Set(p.clips.filter((c) => c.sourceId === id).map((c) => c.id));
          let overlays = p.overlays;
          for (const cid of gone) overlays = dropOverlaysOfClip(overlays, cid);
          return { ...p, clips: p.clips.filter((c) => c.sourceId !== id), overlays };
        });
        return;
      }
      const source = latest.current.sources.find((s) => s.id === id);
      if (!source) return;
      if (latest.current.project.clips.length >= LIMITS.maxClips) {
        toast.error(`A reel can have up to ${LIMITS.maxClips} clips.`);
        return;
      }
      update((p) => ({ ...p, clips: [...p.clips, makeClip(source, getPreset(p.presetKey), p.clips.length)] }));
    },
    [update],
  );

  const selectAllSources = useCallback(
    (on: boolean) => {
      if (!on) {
        update((p) => ({ ...p, clips: [], overlays: p.overlays.filter((o) => o.anchor.type !== "clip") }));
        setSelection(null);
        return;
      }
      update((p) => {
        const have = new Set(p.clips.map((c) => c.sourceId));
        const preset = getPreset(p.presetKey);
        const extra = latest.current.sources.filter((s) => !have.has(s.id)).map((s, i) => makeClip(s, preset, p.clips.length + i));
        return { ...p, clips: [...p.clips, ...extra].slice(0, LIMITS.maxClips) };
      });
    },
    [update],
  );

  const removeLocalSource = useCallback(
    (id: string) => {
      update((p) => {
        const gone = new Set(p.clips.filter((c) => c.sourceId === id).map((c) => c.id));
        let overlays = p.overlays;
        for (const cid of gone) overlays = dropOverlaysOfClip(overlays, cid);
        return { ...p, clips: p.clips.filter((c) => c.sourceId !== id), overlays };
      });
      // Keep the bytes until the edit can no longer be undone? The history holds ids only, so a removed
      // local photo can't be restored; release it now.
      library.removeLocal(id);
      setSources((list) => list.filter((s) => s.id !== id));
    },
    [library, update],
  );

  // -- music ---------------------------------------------------------------

  const stopTrackPreview = useCallback(() => {
    if (trackTimer.current) clearTimeout(trackTimer.current);
    trackTimer.current = null;
    audio.stop();
    setTrackPlaying(false);
  }, [audio]);

  const importMusic = useCallback(
    async (file: File) => {
      player.pause();
      stopTrackPreview();
      try {
        const loaded = await audio.load(file);
        setTrack(loaded);
        update((p) => ({ ...p, music: { ...p.music, name: loaded.name, trimStartMs: 0, trimEndMs: null, muted: false } }));
        setSelection({ type: "music" });
        toast.success(`${loaded.name} added`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "That audio file couldn't be added.");
      }
    },
    [audio, player, update, stopTrackPreview],
  );

  const removeMusic = useCallback(() => {
    player.pause();
    stopTrackPreview();
    audio.clear();
    setTrack(null);
    update((p) => ({ ...p, music: { ...DEFAULT_MUSIC } }));
  }, [audio, player, update, stopTrackPreview]);

  const toggleTrackPreview = useCallback(async () => {
    if (!audio.hasTrack) return;
    if (trackPlaying) {
      stopTrackPreview();
      return;
    }
    player.pause();
    const m = latest.current.project.music;
    const end = m.trimEndMs ?? audio.durationMs;
    const region = Math.max(500, end - m.trimStartMs);
    await audio.start(0, { ...m, muted: false, loop: false, fadeInMs: 0, fadeOutMs: Math.min(m.fadeOutMs, region / 3) }, region);
    setTrackPlaying(true);
    trackTimer.current = setTimeout(() => setTrackPlaying(false), region);
  }, [audio, player, trackPlaying, stopTrackPreview]);

  // -- project -------------------------------------------------------------

  const saveProject = useCallback(
    (options?: { quiet?: boolean }) => {
      const res = saveReelProject(brief.tripId, latest.current.project);
      if (!res.ok) {
        toast.error("Your browser wouldn't let this be saved. Storage may be full or blocked.");
        return false;
      }
      setSavedJson(JSON.stringify(latest.current.project));
      setSavedAt(res.savedAt);
      if (!options?.quiet) toast.success("Project settings saved");
      return true;
    },
    [brief.tripId],
  );

  const resetProject = useCallback(() => {
    clearReelProject(brief.tripId);
    const sourceIds = latest.current.sources.filter((s) => !s.local).map((s) => s.id);
    const next = buildProject({ ...brief, sources: latest.current.sources }, { presetKey: latest.current.project.presetKey, sourceIds });
    dispatch({ type: "replace", project: next });
    setSelection(null);
    toast.success("Reel reset to the preset");
  }, [brief]);

  const setPref = useCallback((partial: Partial<ReelPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      return next;
    });
  }, []);

  // -- export --------------------------------------------------------------

  const restorePreview = useCallback(() => {
    exportingRef.current = false;
    const { preview: pv } = latest.current;
    library.setMaxDecoded(8);
    library.setFrame(pv.width, pv.height);
    ensureAround(player.time);
    player.redraw();
  }, [library, player, ensureAround]);

  const startExport = useCallback(
    async (format: FormatOption) => {
      if (exportingRef.current) return;
      player.pause();
      stopTrackPreview();
      if (exportUrl.current) {
        URL.revokeObjectURL(exportUrl.current);
        exportUrl.current = null;
      }
      const ac = new AbortController();
      exportAbort.current = ac;
      exportingRef.current = true;
      setExportUi({ status: "running", progress: { phase: "preparing", fraction: 0, elapsedMs: 0, totalMs, measuredFps: 0 } });
      try {
        const result = await exportReel({
          project: latest.current.project,
          library,
          audio,
          format,
          signal: ac.signal,
          onProgress: (progress) => {
            const now = performance.now();
            if (progress.phase === "rendering" && now - lastProgressAt.current < 120) return;
            lastProgressAt.current = now;
            setExportUi((s) => (s.status === "running" ? { status: "running", progress } : s));
          },
        });
        const url = URL.createObjectURL(result.blob);
        exportUrl.current = url;
        const slug = (latest.current.project.title || brief.title || "travel-reel")
          .normalize("NFKD")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 50);
        const filename = `${slug || "travel-reel"}-reel.${result.format}`;
        setExportUi({ status: "done", result, url, filename });
        // Keep a copy in this browser so it shows up under My memories > Reels. Nothing is uploaded.
        setKept(null);
        saveReelExport(
          {
            tripId: brief.tripId,
            tripTitle: brief.title,
            title: latest.current.project.title,
            filename,
            format: result.format,
            mime: result.mime,
            width: result.width,
            height: result.height,
            durationMs: result.durationMs,
          },
          result.blob,
        )
          .then(() => setKept(true))
          .catch(() => setKept(false));
      } catch (e) {
        if (e instanceof ExportCancelled) setExportUi({ status: "idle", cancelled: true });
        else setExportUi({ status: "error", message: e instanceof Error ? e.message : "The video couldn't be rendered." });
      } finally {
        exportAbort.current = null;
        restorePreview();
      }
    },
    [player, stopTrackPreview, totalMs, library, audio, brief.title, brief.tripId, restorePreview],
  );

  const cancelExport = useCallback(() => exportAbort.current?.abort(), []);
  const resetExport = useCallback(() => {
    if (exportUrl.current) {
      URL.revokeObjectURL(exportUrl.current);
      exportUrl.current = null;
    }
    setExportUi({ status: "idle" });
  }, []);

  // Leaving the page mid-export would lose the render.
  const exporting = exportUi.status === "running";
  useEffect(() => {
    if (!exporting) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [exporting]);

  const finalSize = outputSize(project.aspect, project.resolution);

  return {
    brief,
    library,
    audio,
    player,
    setCanvas,
    project,
    slots,
    totalMs,
    sources,
    usage,
    selection,
    setSelection,
    track,
    trackPlaying,
    busy,
    importing,
    loadErrors,
    prefs,
    setPref,
    preview,
    finalSize,
    capabilities,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    dirty,
    savedAt,
    restored: init.restored,
    dropped: init.dropped,
    update,
    patch,
    patchClip,
    setDuration,
    moveClip,
    duplicate,
    deleteClip,
    patchOverlay,
    moveOverlay,
    addOverlay,
    duplicateOverlay,
    deleteOverlay,
    setTransitionForAll,
    setMotionForAll,
    setMusic,
    applyPreset,
    snapToBeat,
    addFiles,
    toggleSource,
    selectAllSources,
    removeLocalSource,
    importMusic,
    removeMusic,
    toggleTrackPreview,
    saveProject,
    resetProject,
    exportUi,
    kept,
    startExport,
    cancelExport,
    resetExport,
  };
}

export type ReelStudioApi = ReturnType<typeof useReelStudio>;
