"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { DevicePreview, DeviceToggle, type PreviewDevice } from "@/components/memory/device-preview";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MemoryContent } from "@/features/memories/types";
import { getTemplate, templates } from "@/features/templates/registry";
import { MemoryRenderer } from "@/features/templates/render";
import { deletePhoto, reorderPhotos, updatePhoto, updateTrip } from "@/features/trips/actions";
import type { EditorPhoto, EditorTrip, Publication } from "@/features/trips/types";
import { DesignPanel } from "./panels/design-panel";
import { DetailsPanel } from "./panels/details-panel";
import { PhotosPanel } from "./panels/photos-panel";
import { PublishDialog } from "./publish-dialog";
import { SaveIndicator } from "./save-indicator";
import type { DraftFields, SetField } from "./types";
import { useAutosave, type SaveHandler } from "./use-autosave";
import { useUploads } from "./use-uploads";

export function Editor({ trip, userId, demo }: { trip: EditorTrip; userId: string | null; demo: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftFields>({
    title: trip.title,
    description: trip.description,
    destinationSlug: trip.destinationSlug,
    templateSlug: trip.templateSlug,
    layout: trip.layout,
    palette: trip.palette,
    startDate: trip.startDate,
    endDate: trip.endDate,
  });
  const [photos, setPhotos] = useState<EditorPhoto[]>(trip.photos);
  const [publication, setPublication] = useState<Publication | null>(trip.publication);
  const [editedSincePublish, setEditedSincePublish] = useState(
    Boolean(trip.publication && new Date(trip.updatedAt) > new Date(trip.publication.updatedAt)),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [tab, setTab] = useState("details");
  const [leaveTo, setLeaveTo] = useState<string | null>(null);

  const save = useCallback<SaveHandler>(
    async (key, patch) => {
      const result = key === "trip" ? await updateTrip(trip.id, patch) : await updatePhoto(key.slice("photo:".length), patch);
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return { ok: false, error: result.error };
      }
      setFieldErrors({});
      return { ok: true };
    },
    [trip.id],
  );
  const autosave = useAutosave({ save, enabled: !demo });

  const markEdited = useCallback(() => setEditedSincePublish(true), []);

  const setField = useCallback<SetField>(
    (key, value) => {
      const patch: Partial<DraftFields> = { [key]: value };
      // Palettes belong to a destination and layouts to a template.
      if (key === "destinationSlug") patch.palette = null;
      if (key === "templateSlug") patch.layout = (getTemplate(value as string) ?? templates[0]).layouts[0].key;
      setDraft((d) => ({ ...d, ...patch }));
      autosave.schedule("trip", patch);
      markEdited();
    },
    [autosave, markEdited],
  );

  const uploads = useUploads({
    tripId: trip.id,
    userId,
    demo,
    photoCount: photos.length,
    onUploaded: useCallback(
      (photo: EditorPhoto) => {
        setPhotos((list) => [...list, photo]);
        markEdited();
      },
      [markEdited],
    ),
  });

  const onFiles = (files: File[]) => {
    const rejected = uploads.add(files);
    for (const message of rejected) toast.error(message);
  };

  const onChangePhoto = (id: string, field: "caption" | "location" | "takenOn", value: string | null) => {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    autosave.schedule(`photo:${id}`, { [field]: value });
    markEdited();
  };

  const onReorder = async (from: number, to: number) => {
    const previous = photos;
    const next = arrayMove(photos, from, to);
    setPhotos(next);
    markEdited();
    if (demo) return;
    const result = await reorderPhotos({ tripId: trip.id, photoIds: next.map((p) => p.id) });
    if (!result.ok) {
      setPhotos(previous);
      toast.error(result.error);
    }
  };

  const onDeletePhoto = async (id: string) => {
    const previous = photos;
    autosave.discard(`photo:${id}`);
    setPhotos((list) => list.filter((p) => p.id !== id));
    markEdited();
    if (demo) return;
    const result = await deletePhoto(id);
    if (!result.ok) {
      setPhotos(previous);
      toast.error(result.error);
    } else {
      toast.success("Photo deleted");
    }
  };

  // Warn before closing the tab with unsaved changes or uploads in flight.
  const uploadsBusy = uploads.busy;
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autosave.hasPending() || uploadsBusy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [autosave, uploadsBusy]);

  /** In-app navigation: save first; if that fails, ask before leaving. */
  const guardedNavigate = async (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (demo || (!autosave.hasPending() && !uploads.busy)) return;
    e.preventDefault();
    const saved = uploads.busy ? false : await autosave.flush();
    if (saved) router.push(href);
    else setLeaveTo(href);
  };

  const blockers = useMemo(() => {
    const list: string[] = [];
    if (!draft.title.trim()) list.push("Add a title in Details.");
    if (photos.length === 0) list.push("Add at least one photo.");
    if (uploads.busy) list.push("Wait for uploads to finish.");
    return list;
  }, [draft.title, photos.length, uploads.busy]);

  const memory: MemoryContent = useMemo(
    () => ({
      ...draft,
      photos: [
        ...photos.map((p) => ({ id: p.id, src: p.url, width: p.width, height: p.height, caption: p.caption, location: p.location, takenOn: p.takenOn })),
        ...uploads.items.map((u) => ({ id: u.localId, src: u.previewUrl, width: 4, height: 3, caption: "", location: "", takenOn: null })),
      ],
    }),
    [draft, photos, uploads.items],
  );

  const preview = (
    <section aria-label="Live preview" className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Live preview</p>
        <DeviceToggle value={device} onChange={setDevice} />
      </div>
      <DevicePreview device={device} label="Memory preview" height="h-[min(52rem,calc(100svh-12rem))]">
        <MemoryRenderer memory={memory} sizesHint="preview" />
      </DevicePreview>
    </section>
  );

  return (
    <MotionProvider>
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        {demo ? (
          <p className="bg-warning px-4 py-1.5 text-center text-xs font-medium text-white">
            Demo mode with sample data. Nothing is saved or uploaded. Connect Supabase to save your work.
          </p>
        ) : null}
        <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <Button asChild variant="ghost" size="icon" aria-label="Back to my memories">
            <Link href="/my-memories" onClick={(e) => guardedNavigate(e, "/my-memories")}>
              <ArrowLeft />
            </Link>
          </Button>
          <LogoMark className="hidden size-7 sm:block" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg leading-tight">{draft.title || "Untitled trip"}</h1>
            <SaveIndicator status={autosave.status} error={autosave.error} lastSavedAt={autosave.lastSavedAt} demo={demo} onRetry={() => void autosave.flush()} />
          </div>
          {!demo ? (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex sm:h-11">
              <Link href={`/preview/${trip.id}`} onClick={(e) => guardedNavigate(e, `/preview/${trip.id}`)}>
                <Eye data-icon="inline-start" /> Preview
              </Link>
            </Button>
          ) : null}
          <PublishDialog
            tripId={trip.id}
            publication={publication}
            blockers={blockers}
            hasChangesSincePublish={editedSincePublish}
            demo={demo}
            flush={autosave.flush}
            onChange={(p) => {
              setPublication(p);
              setEditedSincePublish(false);
            }}
          />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[96rem] flex-1 gap-8 px-3 py-5 sm:px-5 lg:grid-cols-[minmax(22rem,30rem)_1fr] lg:gap-10">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-4 lg:grid-cols-3">
            <EditorTab value="details">Details</EditorTab>
            <EditorTab value="photos">Photos{photos.length ? ` (${photos.length})` : ""}</EditorTab>
            <EditorTab value="design">Design</EditorTab>
            <EditorTab value="preview" className="lg:hidden">
              Preview
            </EditorTab>
          </TabsList>
          <TabsContent value="details" className="pt-6">
            <DetailsPanel draft={draft} setField={setField} errors={fieldErrors} />
          </TabsContent>
          <TabsContent value="photos" className="pt-6">
            <PhotosPanel
              photos={photos}
              uploads={uploads.items}
              demo={demo}
              onFiles={onFiles}
              onRetryUpload={uploads.retry}
              onRemoveUpload={uploads.remove}
              onReorder={onReorder}
              onChangePhoto={onChangePhoto}
              onDeletePhoto={onDeletePhoto}
            />
          </TabsContent>
          <TabsContent value="design" className="pt-6">
            <DesignPanel draft={draft} setField={setField} />
          </TabsContent>
          <TabsContent value="preview" className="pt-6 lg:hidden">
            {preview}
          </TabsContent>
        </Tabs>

        <div className="hidden lg:block">
          <div className="sticky top-24">{preview}</div>
        </div>
      </div>

      <AlertDialog open={leaveTo !== null} onOpenChange={(open) => !open && setLeaveTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave with unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {uploads.busy
                ? "Photos are still uploading. If you leave now, unfinished uploads will be lost."
                : "Some changes couldn't be saved. If you leave now, they'll be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay and keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const target = leaveTo;
                setLeaveTo(null);
                if (target) router.push(target);
              }}
            >
              Leave anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </MotionProvider>
  );
}

function EditorTab({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsTrigger value={value} className={`min-h-11 text-sm ${className ?? ""}`}>
      {children}
    </TabsTrigger>
  );
}
