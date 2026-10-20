"use client";

import {
  ArrowLeft,
  Blend,
  Clapperboard,
  Download,
  Images,
  LayoutTemplate,
  Music2,
  Play,
  Redo2,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState, type DragEvent } from "react";
import { MotionProvider } from "@/components/motion/motion-provider";
import { LogoMark } from "@/components/site/logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReelTripBrief } from "../types";
import { ClipInspector } from "./clip-inspector";
import { ExportDialog } from "./export-dialog";
import { MusicControls } from "./music-controls";
import { EffectsPanel, MediaPanel, MusicPanel, OutputSummary, SettingsPanel, TemplatesPanel, TextPanel, TransitionsPanel } from "./panels";
import { PreviewStage } from "./preview-stage";
import { Section } from "./controls";
import { TextEditor } from "./text-editor";
import { Timeline } from "./timeline";
import { useMounted, useReelStudio, type PanelKey, type ReelStudioApi } from "./use-reel-studio";
import { syncReelProjects } from "../storage";

const PANELS: { key: PanelKey; label: string; icon: LucideIcon }[] = [
  { key: "media", label: "Media", icon: Images },
  { key: "music", label: "Music", icon: Music2 },
  { key: "transitions", label: "Transitions", icon: Blend },
  { key: "effects", label: "Effects", icon: Sparkles },
  { key: "text", label: "Text", icon: Type },
  { key: "templates", label: "Styles", icon: LayoutTemplate },
  { key: "settings", label: "Settings", icon: SlidersHorizontal },
];

export function StudioSkeleton() {
  return (
    <div aria-busy aria-label="Opening the reel studio" className="reel-dark fixed inset-0 z-40 flex flex-col bg-background text-foreground">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Skeleton className="size-9" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="ml-auto h-10 w-28" />
      </div>
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[22rem_1fr_19rem]">
        <Skeleton className="hidden h-full lg:block" />
        <Skeleton className="mx-auto h-full w-full max-w-sm" />
        <Skeleton className="hidden h-full lg:block" />
      </div>
      <Skeleton className="h-48 rounded-none" />
    </div>
  );
}

export function ReelStudio({ brief, demo }: { brief: ReelTripBrief; demo: boolean }) {
  const mounted = useMounted();
  // Pull the account's copy of the reel settings first, so a reel started on another device opens here.
  const [synced, setSynced] = useState(demo);
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    void syncReelProjects().finally(() => {
      if (!cancelled) setSynced(true);
    });
    return () => {
      cancelled = true;
    };
  }, [demo]);
  if (!mounted || !synced) return <StudioSkeleton />;
  return <StudioInner brief={brief} demo={demo} />;
}

function PanelBody({ panel, studio }: { panel: PanelKey; studio: ReelStudioApi }) {
  switch (panel) {
    case "media":
      return <MediaPanel studio={studio} />;
    case "music":
      return <MusicPanel studio={studio} />;
    case "transitions":
      return <TransitionsPanel studio={studio} />;
    case "effects":
      return <EffectsPanel studio={studio} />;
    case "text":
      return <TextPanel studio={studio} />;
    case "templates":
      return <TemplatesPanel studio={studio} />;
    case "settings":
      return <SettingsPanel studio={studio} />;
  }
}

function Inspector({ studio, onExport }: { studio: ReelStudioApi; onExport: () => void }) {
  const sel = studio.selection;
  if (sel?.type === "clip" && studio.project.clips.some((c) => c.id === sel.id)) return <ClipInspector studio={studio} clipId={sel.id} />;
  if (sel?.type === "text") {
    const overlay = studio.project.overlays.find((o) => o.id === sel.id);
    if (overlay) return <TextEditor studio={studio} overlay={overlay} />;
  }
  if (sel?.type === "music") return <MusicControls studio={studio} />;
  return (
    <div>
      <Section title="Your reel">
        <OutputSummary studio={studio} />
        <Button className="w-full" onClick={onExport} disabled={studio.project.clips.length === 0}>
          <Download data-icon="inline-start" /> Export video
        </Button>
      </Section>
      <Section title="Tips">
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
          <li>Select a clip, text or the music track to edit it here.</li>
          <li>Drag clips to reorder them, and drag a clip&apos;s right edge to change its length.</li>
          <li>Space plays and pauses. Ctrl or ⌘ + Z undoes, Shift + Z redoes.</li>
          <li>Try a different style in Styles for a new look in one click.</li>
        </ul>
      </Section>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"], [role="alertdialog"]'));
}

function StudioInner({ brief, demo }: { brief: ReelTripBrief; demo: boolean }) {
  const router = useRouter();
  const studio = useReelStudio(brief);
  const { project } = studio;
  const [panel, setPanel] = useState<PanelKey>("media");
  const [sheet, setSheet] = useState<"panel" | "inspector" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [leave, setLeave] = useState<"export" | "unsaved" | null>(null);
  const [dropping, setDropping] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const backHref = `/editor/${demo ? "demo" : brief.tripId}`;

  // The dark studio theme also applies to dialogs and toasts, which render in portals.
  useEffect(() => {
    document.documentElement.classList.add("reel-dark");
    return () => document.documentElement.classList.remove("reel-dark");
  }, []);

  useEffect(() => {
    if (studio.restored) {
      toast.message("Picked up where you left off", {
        description: studio.dropped > 0 ? `${studio.dropped} clip${studio.dropped === 1 ? "" : "s"} used photos that are no longer here and were left out.` : undefined,
      });
    }
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exporting = studio.exportUi.status === "running";

  /** Navigates, and falls back to a full page load if the client router doesn't move. */
  const goBack = () => {
    router.push(backHref);
    window.setTimeout(() => {
      // Deliberate fallback: the client router did not move, so do a full page load.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (window.location.pathname !== backHref) window.location.href = backHref;
    }, 1200);
  };

  const requestLeave = () => {
    if (exporting) {
      setLeave("export");
      return;
    }
    // Settings are already auto-saved to the account; flush them so nothing is lost, then leave.
    if (studio.dirty) studio.saveProject({ quiet: true });
    goBack();
  };

  /** Full-screen preview: only the reel, no editing tools. */
  const startPresenting = () => {
    studio.player.pause();
    setPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    // Let the stage resize to the full screen before playing from the start.
    window.setTimeout(() => {
      studio.player.seek(0);
      void studio.player.play();
    }, 250);
  };
  const stopPresenting = () => {
    studio.player.pause();
    setPresenting(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };
  useEffect(() => {
    if (!presenting) return;
    const onFs = () => {
      if (!document.fullscreenElement) {
        studio.player.pause();
        setPresenting(false);
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [presenting, studio.player]);

  const openPanel = (key: PanelKey) => {
    setPanel(key);
    setSheet("panel");
  };

  // Keyboard shortcuts.
  const { player } = studio;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (presenting && e.key === "Escape") {
        stopPresenting();
        return;
      }
      if (exporting || e.defaultPrevented) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && !isTypingTarget(e.target) && (key === "z" || key === "y")) {
        e.preventDefault();
        if (key === "y" || e.shiftKey) studio.redo();
        else studio.undo();
        return;
      }
      if (mod && key === "e") {
        e.preventDefault();
        setExportOpen(true);
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        studio.saveProject();
        return;
      }
      if (isTypingTarget(e.target) || mod || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === " " && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault();
        player.toggle();
      } else if (e.key === "ArrowRight" && tag !== "BUTTON") {
        player.seek(player.time + (e.shiftKey ? 5000 : 1000));
      } else if (e.key === "ArrowLeft" && tag !== "BUTTON") {
        player.seek(player.time - (e.shiftKey ? 5000 : 1000));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const sel = studio.selection;
        if (sel?.type === "clip") studio.deleteClip(sel.id);
        else if (sel?.type === "text") studio.deleteOverlay(sel.id);
      } else if (key === "d" && studio.selection?.type === "clip") {
        studio.duplicate(studio.selection.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio, player, exporting, presenting]);

  const onDragOver = (e: DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      setDropping(true);
    }
  };
  const onDrop = (e: DragEvent) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    setDropping(false);
    void studio.addFiles(Array.from(e.dataTransfer.files));
  };

  const selectionLabel = studio.selection ? (studio.selection.type === "clip" ? "Clip" : studio.selection.type === "text" ? "Text" : "Music") : "Edit";

  return (
    <MotionProvider>
      <div
        className="reel-dark fixed inset-0 z-40 flex flex-col bg-background text-foreground"
        onDragOver={onDragOver}
        onDragLeave={(e) => e.currentTarget === e.target && setDropping(false)}
        onDrop={onDrop}
      >
        {/* Top toolbar */}
        <header className={cn("flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-card/80 px-2 backdrop-blur sm:gap-2 sm:px-3", presenting && "hidden")}>
          <Button variant="ghost" size="icon-sm" aria-label="Back to the editor" onClick={requestLeave}>
            <ArrowLeft />
          </Button>
          <LogoMark alwaysDark className="hidden h-7 shrink-0 md:block" />
          <div className="min-w-0 flex-1 sm:ml-2 sm:flex-none sm:basis-72">
            <label className="sr-only" htmlFor="reel-title">
              Project title
            </label>
            <input
              id="reel-title"
              value={project.title}
              maxLength={80}
              onChange={(e) => studio.patch({ title: e.target.value }, "title")}
              className="h-9 w-full truncate rounded-lg border border-transparent bg-transparent px-2 font-display text-base outline-none hover:border-input focus-visible:border-ring focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>
          <p className="hidden text-xs text-muted-foreground lg:block">{studio.dirty ? "Unsaved changes" : studio.savedAt ? "Saved" : "Auto-saved to your account"}</p>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Undo (Ctrl or ⌘ Z)" onClick={studio.undo} disabled={!studio.canUndo}>
              <Undo2 />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Redo (Shift + Ctrl or ⌘ Z)" onClick={studio.redo} disabled={!studio.canRedo}>
              <Redo2 />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={project.clips.length === 0}
              aria-label="Preview the reel"
              onClick={startPresenting}
            >
              <Play data-icon="inline-start" /> <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button size="sm" onClick={() => setExportOpen(true)} disabled={project.clips.length === 0}>
              <Download data-icon="inline-start" /> <span className="hidden sm:inline">Export video</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex min-h-0 flex-1">
          {/* Left rail + panel (desktop) */}
          <nav aria-label="Editing tools" className={cn("hidden w-[4.5rem] shrink-0 flex-col gap-1 border-r border-border bg-card/60 p-1.5 lg:flex", presenting && "lg:hidden")}>
            {PANELS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={panel === key}
                onClick={() => setPanel(key)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.68rem] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                  panel === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </button>
            ))}
          </nav>
          <aside aria-label={PANELS.find((p) => p.key === panel)?.label} className={cn("hidden w-80 shrink-0 overflow-y-auto border-r border-border bg-card/40 lg:block", presenting && "lg:hidden")}>
            <PanelBody panel={panel} studio={studio} />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <PreviewStage presenting={presenting} onClose={stopPresenting} studio={studio} onOpenMedia={() => (window.matchMedia("(min-width: 1024px)").matches ? setPanel("media") : openPanel("media"))} />
            <div className={cn("h-[13.5rem] shrink-0 sm:h-60 lg:h-72", presenting && "hidden")}>
              <Timeline studio={studio} onAddMusic={() => openPanel("music")} />
            </div>
          </div>

          {/* Right inspector (desktop) */}
          <aside aria-label="Properties" className={cn("hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card/40 xl:block", presenting && "xl:hidden")}>
            <Inspector studio={studio} onExport={() => setExportOpen(true)} />
          </aside>
        </div>

        {/* Tool bar for narrower screens */}
        <nav aria-label="Editing tools" className={cn("flex shrink-0 gap-0.5 overflow-x-auto border-t border-border bg-card/90 px-1.5 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] xl:hidden", presenting && "hidden")}>
          {PANELS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => openPanel(key)}
              className="panel flex min-h-12 min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.65rem] text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 lg:hidden"
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSheet("inspector")}
            className={cn(
              "flex min-h-12 min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.65rem] outline-none focus-visible:ring-3 focus-visible:ring-ring/60 xl:hidden",
              studio.selection ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Clapperboard aria-hidden className="size-5" />
            {selectionLabel}
          </button>
        </nav>

        {/* Sheets for small screens */}
        <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
          <SheetContent side="bottom" className="reel-dark max-h-[62svh] gap-0 overflow-y-auto rounded-t-2xl border-border bg-card p-0 text-foreground">
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-card">
              <SheetTitle>{sheet === "inspector" ? "Edit selection" : PANELS.find((p) => p.key === panel)?.label}</SheetTitle>
              <SheetDescription className="sr-only">Editing controls for your reel</SheetDescription>
            </SheetHeader>
            {sheet === "inspector" ? <Inspector studio={studio} onExport={() => (setSheet(null), setExportOpen(true))} /> : <PanelBody panel={panel} studio={studio} />}
            <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              <Button className="w-full" size="lg" onClick={() => setSheet(null)}>
                Done
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <ExportDialog studio={studio} open={exportOpen} onOpenChange={setExportOpen} />

        {dropping ? (
          <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm" role="status">
            <p className="flex items-center gap-2 rounded-xl border border-dashed border-primary bg-card px-6 py-4 text-sm">
              <Upload aria-hidden className="size-4" /> Drop photos to add them to your reel
            </p>
          </div>
        ) : null}

        <AlertDialog open={leave !== null} onOpenChange={(o) => !o && setLeave(null)}>
          <AlertDialogContent className="reel-dark">
            <AlertDialogHeader>
              <AlertDialogTitle>{leave === "export" ? "Stop rendering and leave?" : "Leave without saving?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {leave === "export"
                  ? "Your video is still being rendered. If you leave now it will be lost, though your edits are kept."
                  : "You have changes that aren't saved as project settings. They're auto-saved as a draft to your account, so you can pick them up next time on any device."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (leave === "export") studio.cancelExport();
                  goBack();
                }}
              >
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MotionProvider>
  );
}
