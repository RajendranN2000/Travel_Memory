"use client";

import {
  ArrowLeft,
  BookOpen,
  Download,
  Eye,
  Files,
  Images,
  LayoutGrid,
  LayoutTemplate,
  Palette,
  PanelRight,
  Paintbrush,
  Printer,
  Redo2,
  Save,
  Shapes,
  Type,
  Undo2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { buildBook, getTemplate } from "../templates";
import { latestBookForTrip, loadBook, loadImages, saveBook } from "../storage";
import type { BookBrief } from "../types";
import { CropDialog } from "./crop-dialog";
import { ExportDialog } from "./export-dialog";
import { PageNavigator } from "./page-navigator";
import { BackgroundsPanel, LayoutsPanel, PagesPanel, PhotosPanel, PrintPanel, ShapesPanel, TemplatesPanel, TextPanel, ThemesPanel, UploadsPanel } from "./panels";
import { PreviewDialog } from "./preview-dialog";
import { ProjectsDialog } from "./projects-dialog";
import { Properties } from "./properties";
import { useBookStudio, useMounted, type BookStudioApi, type BootData, type PanelKey } from "./use-book-studio";
import { Workspace } from "./workspace";

const PANELS: { key: PanelKey; label: string; icon: LucideIcon }[] = [
  { key: "templates", label: "Templates", icon: LayoutTemplate },
  { key: "pages", label: "Pages", icon: Files },
  { key: "uploads", label: "Uploads", icon: Upload },
  { key: "photos", label: "Photos", icon: Images },
  { key: "text", label: "Text", icon: Type },
  { key: "backgrounds", label: "Backgrounds", icon: Paintbrush },
  { key: "shapes", label: "Shapes", icon: Shapes },
  { key: "layouts", label: "Layouts", icon: LayoutGrid },
  { key: "themes", label: "Themes", icon: Palette },
  { key: "print", label: "Print", icon: Printer },
];

export function BookSkeleton() {
  return (
    <div aria-busy aria-label="Opening the book designer" className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Skeleton className="size-9" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="ml-auto h-10 w-32" />
      </div>
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[5rem_20rem_1fr_20rem]">
        <Skeleton className="hidden h-full lg:block" />
        <Skeleton className="hidden h-full lg:block" />
        <Skeleton className="mx-auto h-full w-full max-w-md" />
        <Skeleton className="hidden h-full lg:block" />
      </div>
      <Skeleton className="h-36 rounded-none" />
    </div>
  );
}

async function bootBook(brief: BookBrief, templateKey: string | null, projectId: string | null): Promise<BootData> {
  try {
    if (projectId) {
      const p = await loadBook(projectId);
      if (p) return { project: p, localImages: await loadImages(p.id), restored: true };
    }
    if (!templateKey) {
      const p = await latestBookForTrip(brief.tripId);
      if (p) return { project: p, localImages: await loadImages(p.id), restored: true };
    }
  } catch {
    // The browser may block IndexedDB (private windows); a new book still works, it just can't be kept.
  }
  const template = getTemplate(templateKey) ?? getTemplate("travel-memories")!;
  const project = buildBook(template, brief);
  void saveBook(project).catch(() => undefined);
  return { project, localImages: [], restored: false };
}

export function BookStudio({ brief, templateKey, projectId, backHref }: { brief: BookBrief; templateKey: string | null; projectId: string | null; backHref: string }) {
  const mounted = useMounted();
  const [boot, setBoot] = useState<BootData | null>(null);
  useEffect(() => {
    let cancelled = false;
    void bootBook(brief, templateKey, projectId).then((b) => !cancelled && setBoot(b));
    return () => {
      cancelled = true;
    };
  }, [brief, templateKey, projectId]);
  if (!mounted || !boot) return <BookSkeleton />;
  return <Studio brief={brief} boot={boot} backHref={backHref} />;
}

function PanelBody({ panel, studio }: { panel: PanelKey; studio: BookStudioApi }) {
  switch (panel) {
    case "templates":
      return <TemplatesPanel studio={studio} />;
    case "pages":
      return <PagesPanel studio={studio} />;
    case "uploads":
      return <UploadsPanel studio={studio} />;
    case "photos":
      return <PhotosPanel studio={studio} />;
    case "text":
      return <TextPanel studio={studio} />;
    case "backgrounds":
      return <BackgroundsPanel studio={studio} />;
    case "shapes":
      return <ShapesPanel studio={studio} />;
    case "layouts":
      return <LayoutsPanel studio={studio} />;
    case "themes":
      return <ThemesPanel studio={studio} />;
    case "print":
      return <PrintPanel studio={studio} />;
  }
}

function SaveStatus({ studio }: { studio: BookStudioApi }) {
  const text = { saved: "Saved in this browser", saving: "Saving…", dirty: "Unsaved changes", error: "Can't save in this browser" }[studio.saveState];
  return (
    <p role="status" className={cn("hidden text-xs md:block", studio.saveState === "error" ? "text-destructive" : "text-muted-foreground")}>
      {text}
    </p>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"]'));
}

function Studio({ brief, boot, backHref }: { brief: BookBrief; boot: BootData; backHref: string }) {
  const router = useRouter();
  const studio = useBookStudio(brief, boot);
  const { project } = studio;
  const [panel, setPanel] = useState<PanelKey>("templates");
  const [sheet, setSheet] = useState<"panel" | "props" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [cropFor, setCropFor] = useState<string | null>(null);
  const [leave, setLeave] = useState(false);
  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    if (studio.restored) toast.message("Picked up where you left off");
    // once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exporting = studio.exportUi.status === "running";

  const requestLeave = async () => {
    if (exporting) {
      setLeave(true);
      return;
    }
    if (studio.saveState !== "saved") {
      const ok = await studio.saveNow();
      if (!ok) {
        setLeave(true);
        return;
      }
    }
    router.push(backHref);
  };

  const openPanel = (key: PanelKey) => {
    setPanel(key);
    setSheet("panel");
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || exporting) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const typing = isTypingTarget(e.target);
      if (mod && !typing && (key === "z" || key === "y")) {
        e.preventDefault();
        if (key === "y" || e.shiftKey) studio.redo();
        else studio.undo();
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        void studio.saveNow().then((ok) => ok && toast.success("Saved in this browser"));
        return;
      }
      if (mod && key === "p") {
        e.preventDefault();
        setExportOpen(true);
        return;
      }
      if (typing || mod || e.altKey) return;
      const sel = studio.selection;
      const el = studio.selectedElement;
      if (e.key === "Escape") studio.selectElement(sel.pageId, null);
      else if ((e.key === "Delete" || e.key === "Backspace") && el && !el.locked) {
        e.preventDefault();
        studio.deleteElement(sel.pageId, el.id);
      } else if (key === "d" && el) {
        studio.duplicateElementById(sel.pageId, el.id);
      } else if (el && !el.locked && e.key.startsWith("Arrow") && (e.target as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        const f = { ...el.frame };
        if (e.key === "ArrowLeft") f.x -= step;
        if (e.key === "ArrowRight") f.x += step;
        if (e.key === "ArrowUp") f.y -= step;
        if (e.key === "ArrowDown") f.y += step;
        studio.setFrame(sel.pageId, el.id, f, `nudge:${el.id}`);
      } else if (e.key === "PageDown") studio.goToPage(studio.pageIndex + 1);
      else if (e.key === "PageUp") studio.goToPage(studio.pageIndex - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [studio, exporting]);

  // Photos dropped anywhere in the editor go to Uploads.
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

  const badge = studio.issueSummary.errors + studio.issueSummary.warnings;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background text-foreground" onDragOver={onDragOver} onDragLeave={(e) => e.currentTarget === e.target && setDropping(false)} onDrop={onDrop}>
      <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-card px-2 sm:gap-2 sm:px-3">
        <Button variant="ghost" size="icon-sm" aria-label="Back to your memory" onClick={() => void requestLeave()}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1 sm:flex-none sm:basis-72">
          <label htmlFor="book-title" className="sr-only">
            Book name
          </label>
          <input id="book-title" value={project.title} maxLength={80} onChange={(e) => studio.rename(e.target.value)} className="h-9 w-full truncate rounded-lg border border-transparent bg-transparent px-2 font-display text-base outline-none hover:border-input focus-visible:border-ring focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40" />
        </div>
        <SaveStatus studio={studio} />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Undo (Ctrl or ⌘ Z)" disabled={!studio.canUndo} onClick={studio.undo}>
            <Undo2 />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Redo (Shift + Ctrl or ⌘ Z)" disabled={!studio.canRedo} onClick={studio.redo}>
            <Redo2 />
          </Button>
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => void studio.saveNow().then((ok) => ok && toast.success("Saved in this browser"))}>
            <Save data-icon="inline-start" /> Save
          </Button>
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => setProjectsOpen(true)}>
            <BookOpen data-icon="inline-start" /> Books
          </Button>
          <Button variant="secondary" size="sm" className="hidden sm:inline-flex" onClick={() => setPreviewOpen(true)}>
            <Eye data-icon="inline-start" /> Preview
          </Button>
          <Button variant="secondary" size="sm" className="hidden lg:inline-flex" onClick={() => setExportOpen(true)}>
            <Printer data-icon="inline-start" /> Print
          </Button>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <Download data-icon="inline-start" /> <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Design tools" className="hidden w-[4.5rem] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border bg-card p-1.5 lg:flex">
          {PANELS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" aria-pressed={panel === key} onClick={() => setPanel(key)} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60", panel === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              <Icon aria-hidden className="size-5" />
              {label}
            </button>
          ))}
        </nav>
        <aside aria-label={PANELS.find((p) => p.key === panel)?.label} className="hidden w-80 shrink-0 overflow-y-auto border-r border-border bg-card/60 lg:block">
          <PanelBody panel={panel} studio={studio} />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Workspace studio={studio} />
          <PageNavigator studio={studio} onOpenPages={() => (window.matchMedia("(min-width: 1024px)").matches ? setPanel("pages") : openPanel("pages"))} />
        </div>

        <aside aria-label="Properties" className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card/60 xl:block">
          <Properties studio={studio} onCrop={setCropFor} />
        </aside>
      </div>

      <nav aria-label="Design tools" className="flex shrink-0 gap-0.5 overflow-x-auto border-t border-border bg-card px-1.5 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] xl:hidden">
        {PANELS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => openPanel(key)} className="flex min-h-12 min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.65rem] text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 lg:hidden">
            <Icon aria-hidden className="size-5" />
            {label}
          </button>
        ))}
        <button type="button" onClick={() => setSheet("props")} className={cn("relative flex min-h-12 min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.65rem] outline-none focus-visible:ring-3 focus-visible:ring-ring/60", studio.selection.elementId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
          <PanelRight aria-hidden className="size-5" />
          Edit
          {badge > 0 ? <span className="absolute top-1 right-3 size-2 rounded-full bg-warning" aria-label={`${badge} checks need attention`} /> : null}
        </button>
      </nav>

      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[80svh] gap-0 overflow-y-auto rounded-t-2xl border-border bg-card p-0 text-foreground">
          <SheetHeader className="sticky top-0 z-10 border-b border-border bg-card">
            <SheetTitle>{sheet === "props" ? "Edit selection" : PANELS.find((p) => p.key === panel)?.label}</SheetTitle>
            <SheetDescription className="sr-only">Controls for your book</SheetDescription>
          </SheetHeader>
          {sheet === "props" ? <Properties studio={studio} onCrop={(id) => (setSheet(null), setCropFor(id))} /> : <PanelBody panel={panel} studio={studio} />}
        </SheetContent>
      </Sheet>

      <ExportDialog studio={studio} open={exportOpen} onOpenChange={setExportOpen} />
      <PreviewDialog studio={studio} open={previewOpen} onOpenChange={setPreviewOpen} />
      <ProjectsDialog studio={studio} open={projectsOpen} onOpenChange={setProjectsOpen} onNew={() => (window.matchMedia("(min-width: 1024px)").matches ? setPanel("templates") : openPanel("templates"))} />
      <CropDialog studio={studio} elementId={cropFor} onClose={() => setCropFor(null)} />

      {dropping ? (
        <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm" role="status">
          <p className="rounded-xl border border-dashed border-primary bg-card px-6 py-4 text-sm">Drop photos to add them to this book</p>
        </div>
      ) : null}

      <AlertDialog open={leave} onOpenChange={setLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{exporting ? "Stop creating the PDF and leave?" : "Leave without saving?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {exporting ? "Your PDF is still being created. If you leave now it will be lost, though your book is kept." : "This browser couldn't save your latest changes. If you leave now they will be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (exporting) studio.cancelExport();
                router.push(backHref);
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
