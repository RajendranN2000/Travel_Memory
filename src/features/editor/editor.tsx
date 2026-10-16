"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clapperboard, Copy, Eye, Images, NotebookPen, Palette, Send, type LucideIcon } from "lucide-react";
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
import type { MemoryContent, PhotoFrame } from "@/features/memories/types";
import { getTemplate, templates } from "@/features/templates/registry";
import { getDestinationTheme } from "@/features/themes/registry";
import { LIMITS } from "@/features/trips/schemas";
import { cn } from "@/lib/utils";
import { MemoryRenderer } from "@/features/templates/render";
import { deletePhoto, reorderPhotos, updatePhoto, updateTrip } from "@/features/trips/actions";
import type { EditorPhoto, EditorTrip, Publication } from "@/features/trips/types";
import { DesignPanel } from "./panels/design-panel";
import { DetailsPanel } from "./panels/details-panel";
import { PhotosPanel } from "./panels/photos-panel";
import { DuplicateTripDialog } from "@/features/trips/duplicate-dialog";
import { PublishDialog } from "./publish-dialog";
import { checkReadiness } from "./readiness";
import { SaveIndicator } from "./save-indicator";
import type { DraftFields, SetField } from "./types";
import { useAutosave, type SaveHandler } from "./use-autosave";
import { useUploads } from "./use-uploads";

export function Editor({
  trip,
  userId,
  demo,
  openPublish = false,
  goal = null,
}: {
  trip: EditorTrip;
  userId: string | null;
  demo: boolean;
  /** Open the publish dialog straight away (arriving from the full preview). */
  openPublish?: boolean;
  /** Started from "make a reel" or "make a photo book": guide the visitor from photos and words to that studio. */
  goal?: "reel" | "book" | null;
}) {
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
  const [tab, setTab] = useState(openPublish ? "design" : "details");
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(openPublish);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [reelBannerOpen, setReelBannerOpen] = useState(goal !== null);
  const studioHref = `/${goal === "book" ? "book" : "reel"}/${demo ? "demo" : trip.id}`;

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

  const onChangeFrame = (id: string, frame: PhotoFrame) => {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, frame } : p)));
    autosave.schedule(`photo:${id}`, { frame });
    markEdited();
  };

  const onReplace = async (photo: EditorPhoto, file: File) => {
    const result = await uploads.replace(photo, file);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    // Keep any caption edits that were still waiting to save; the crop starts fresh.
    setPhotos((list) =>
      list.map((p) => (p.id === photo.id ? { ...result.photo, caption: p.caption, location: p.location, takenOn: p.takenOn, frame: {} } : p)),
    );
    markEdited();
    toast.success("Photo replaced");
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

  // The dialog opened from ?publish=1; drop the flag so a reload doesn't reopen it.
  useEffect(() => {
    if (!openPublish) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("publish");
    window.history.replaceState(window.history.state, "", url);
  }, [openPublish]);

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

  const readiness = useMemo(
    () =>
      checkReadiness({
        title: draft.title,
        description: draft.description,
        startDate: draft.startDate,
        photos,
        uploadsBusy: uploads.busy,
        unsaved: autosave.status === "pending" || autosave.status === "saving",
        saveFailed: autosave.status === "error",
      }),
    [autosave.status, draft.description, draft.startDate, draft.title, photos, uploads.busy],
  );
  const photoUrls = useMemo(() => photos.flatMap((p) => (p.url ? [p.url] : [])), [photos]);

  const memory: MemoryContent = useMemo(
    () => ({
      ...draft,
      photos: [
        ...photos.map((p) => ({ id: p.id, src: p.url, width: p.width, height: p.height, caption: p.caption, location: p.location, takenOn: p.takenOn, frame: p.frame })),
        ...uploads.items.map((u) => ({ id: u.localId, src: u.previewUrl, width: 4, height: 3, caption: "", location: "", takenOn: null })),
      ],
    }),
    [draft, photos, uploads.items],
  );

  const template = getTemplate(draft.templateSlug) ?? templates[0];
  const layoutName = template.layouts.find((l) => l.key === draft.layout)?.name ?? template.layouts[0].name;
  const destinationName = getDestinationTheme(draft.destinationSlug)?.name ?? "Custom";
  const done: Record<StepKey, boolean> = {
    details: draft.title.trim().length > 0,
    photos: photos.length > 0,
    design: false,
  };

  const goTo = (step: string) => {
    setTab(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const preview = (
    <section aria-label="Live preview" className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-3 shadow-soft sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            Live preview
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {template.name} · {layoutName} · {destinationName} theme
          </p>
        </div>
        <DeviceToggle value={device} onChange={setDevice} />
      </div>
      <DevicePreview device={device} label="Memory preview" height="h-[min(52rem,calc(100svh-17.5rem))]">
        <MemoryRenderer memory={memory} sizesHint="preview" />
      </DevicePreview>
      <p className="mt-3 px-1 text-xs text-muted-foreground">
        Changes appear here as you edit.{" "}
        {demo ? "Nothing is saved in demo mode." : "Your draft stays private until you publish it."}
      </p>
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
        <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="icon" aria-label="Back to my memories" className="-ml-2">
            <Link href="/my-memories" onClick={(e) => guardedNavigate(e, "/my-memories")}>
              <ArrowLeft />
            </Link>
          </Button>
          <LogoMark className="hidden h-8 shrink-0 sm:block" />
          <div className="min-w-0 flex-1 sm:ml-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-display text-lg leading-tight">{draft.title || "Untitled trip"}</h1>
              <span
                className={cn(
                  "hidden shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase sm:inline",
                  publication ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {publication ? (editedSincePublish ? "Published · edited" : "Published") : "Draft"}
              </span>
            </div>
            <SaveIndicator status={autosave.status} error={autosave.error} lastSavedAt={autosave.lastSavedAt} demo={demo} onRetry={() => void autosave.flush()} />
          </div>
          {!demo ? (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex sm:h-11 sm:px-4">
              <Link href={`/preview/${trip.id}`} onClick={(e) => guardedNavigate(e, `/preview/${trip.id}`)}>
                <Eye data-icon="inline-start" /> Full preview
              </Link>
            </Button>
          ) : null}
          {photos.length > 0 ? (
            <Button asChild variant="secondary" size="sm" className="sm:h-11 sm:px-4">
              <Link href={`/reel/${demo ? "demo" : trip.id}`} onClick={(e) => guardedNavigate(e, `/reel/${demo ? "demo" : trip.id}`)}>
                <Clapperboard data-icon="inline-start" /> <span className="hidden sm:inline">Create Reel</span>
                <span className="sm:hidden">Reel</span>
              </Link>
            </Button>
          ) : null}
          {photos.length > 0 ? (
            <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex lg:h-11 lg:px-4">
              <Link href={`/book/${demo ? "demo" : trip.id}`} onClick={(e) => guardedNavigate(e, `/book/${demo ? "demo" : trip.id}`)}>
                <BookOpen data-icon="inline-start" /> Photo Book
              </Link>
            </Button>
          ) : null}
          {!demo ? (
            <Button variant="outline" size="sm" className="hidden sm:inline-flex sm:h-11 sm:px-4" onClick={() => setDuplicateOpen(true)}>
              <Copy data-icon="inline-start" /> Duplicate
            </Button>
          ) : null}
          <PublishDialog
            tripId={trip.id}
            publication={publication}
            readiness={readiness}
            photoUrls={photoUrls}
            hasChangesSincePublish={editedSincePublish}
            demo={demo}
            flush={autosave.flush}
            open={publishOpen}
            onOpenChange={setPublishOpen}
            onChange={(p) => {
              setPublication(p);
              setEditedSincePublish(false);
            }}
          />
        </div>
      </header>

      {reelBannerOpen ? (
        <div role="region" aria-label={goal === "book" ? "Making a photo book" : "Making a reel"} className="border-b border-border bg-secondary/60">
          <div className="mx-auto flex w-full max-w-[96rem] flex-wrap items-center gap-x-6 gap-y-3 px-3 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 basis-80 items-start gap-3">
              {goal === "book" ? <BookOpen aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" /> : <Clapperboard aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />}
              <div className="min-w-0">
                <p className="font-semibold">{goal === "book" ? "You're making a photo book" : "You're making a reel"}</p>
                <p className="text-sm text-muted-foreground">
                  {goal === "book"
                    ? "Add your photos and a few details here: the title, dates and the words for each photo. Then press Create Photo Book and choose a design. Your photos stay in your browser."
                    : "Add your photos and a few details here: the title, dates and the words for each photo. Then press Create Reel and we'll turn them into a video. Your photos stay in your browser."}
                </p>
              </div>
            </div>
            <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <li className={cn(photos.length > 0 && "text-success")}>{photos.length > 0 ? "✓" : "1."} Add photos</li>
              <li className={cn(draft.title.trim() && "text-success")}>{draft.title.trim() ? "✓" : "2."} Title and details</li>
              <li>3. {goal === "book" ? "Create Photo Book" : "Create Reel"}</li>
            </ol>
            <div className="flex items-center gap-2">
              {photos.length > 0 ? (
                <Button asChild>
                  <Link href={studioHref} onClick={(e) => guardedNavigate(e, studioHref)}>
                    {goal === "book" ? <BookOpen data-icon="inline-start" /> : <Clapperboard data-icon="inline-start" />} {goal === "book" ? "Create Photo Book" : "Create Reel"}
                  </Link>
                </Button>
              ) : (
                <Button onClick={() => goTo("photos")}>
                  <Images data-icon="inline-start" /> Add photos first
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setReelBannerOpen(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-[96rem] flex-1 items-start gap-6 px-3 py-5 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:gap-8 lg:px-8 xl:grid-cols-[minmax(0,36rem)_minmax(0,1fr)] xl:gap-10">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-4">
          <TabsList aria-label="Editor steps" className="grid h-auto w-full grid-cols-4 gap-1 rounded-xl group-data-horizontal/tabs:h-auto border border-border bg-card p-1.5 shadow-soft lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <StepTab key={step.value} value={step.value} number={i + 1} done={done[step.value]} icon={step.icon}>
                {step.label}
                {step.value === "photos" && photos.length > 0 ? (
                  <span className="rounded-full bg-current/10 px-1.5 text-xs tabular-nums">{photos.length}</span>
                ) : null}
              </StepTab>
            ))}
            <StepTab value="preview" icon={Eye} className="lg:hidden">
              Preview
            </StepTab>
          </TabsList>

          {STEPS.map((step, i) => (
            <TabsContent key={step.value} value={step.value} className="text-base">
              <div className="rounded-xl border border-border bg-card shadow-soft">
                <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
                  <p className="eyebrow text-muted-foreground">
                    Step {i + 1} of {STEPS.length}
                  </p>
                  <h2 className="mt-1 font-display text-2xl leading-tight">{step.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
                <div className="px-4 py-5 sm:px-6 sm:py-6">
                  {step.value === "details" ? (
                    <DetailsPanel draft={draft} setField={setField} errors={fieldErrors} />
                  ) : step.value === "photos" ? (
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
                      replacing={uploads.replacing}
                      onReplace={onReplace}
                      onChangeFrame={onChangeFrame}
                    />
                  ) : (
                    <DesignPanel draft={draft} setField={setField} />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-border bg-muted/40 px-4 py-3 sm:px-6">
                  {i > 0 ? (
                    <Button variant="ghost" onClick={() => goTo(STEPS[i - 1].value)}>
                      <ArrowLeft data-icon="inline-start" /> {STEPS[i - 1].label}
                    </Button>
                  ) : (
                    <span />
                  )}
                  {i < STEPS.length - 1 ? (
                    <Button onClick={() => goTo(STEPS[i + 1].value)}>
                      Next: {STEPS[i + 1].label} <ArrowRight data-icon="inline-end" />
                    </Button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="lg:hidden" onClick={() => goTo("preview")}>
                        <Eye data-icon="inline-start" /> Preview
                      </Button>
                      {!demo ? (
                        <Button asChild variant="outline" className="hidden lg:inline-flex">
                          <Link href={`/preview/${trip.id}`} onClick={(e) => guardedNavigate(e, `/preview/${trip.id}`)}>
                            <Eye data-icon="inline-start" /> Full preview
                          </Link>
                        </Button>
                      ) : null}
                      <Button onClick={() => setPublishOpen(true)}>
                        <Send data-icon="inline-start" /> {publication ? "Next: Update & share" : "Next: Publish"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
          <TabsContent value="preview" className="lg:hidden">
            {preview}
            <div className="mt-4 flex justify-between gap-2">
              <Button variant="ghost" onClick={() => goTo("design")}>
                <ArrowLeft data-icon="inline-start" /> Design
              </Button>
              <Button onClick={() => setPublishOpen(true)}>
                <Send data-icon="inline-start" /> {publication ? "Next: Update & share" : "Next: Publish"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="hidden min-w-0 lg:block lg:sticky lg:top-24">{preview}</div>
      </div>

      {duplicateOpen ? (
        <DuplicateTripDialog
          tripId={trip.id}
          title={draft.title}
          templateSlug={draft.templateSlug}
          open={duplicateOpen}
          onOpenChange={setDuplicateOpen}
          beforeCopy={autosave.flush}
        />
      ) : null}

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

type StepKey = "details" | "photos" | "design";

const STEPS: Array<{ value: StepKey; label: string; title: string; description: string; icon: LucideIcon }> = [
  {
    value: "details",
    label: "Details",
    title: "Trip details",
    description: "Name your trip and tell its story. Only the title is required.",
    icon: NotebookPen,
  },
  {
    value: "photos",
    label: "Photos",
    title: "Photos",
    description: `Add up to ${LIMITS.photosPerTrip} photos, put them in order and caption the ones that matter.`,
    icon: Images,
  },
  {
    value: "design",
    label: "Design",
    title: "Design",
    description: "Pick a destination theme, template, layout and colours. The preview updates instantly.",
    icon: Palette,
  },
];

function StepTab({
  value,
  number,
  done,
  icon: Icon,
  children,
  className,
}: {
  value: string;
  number?: number;
  done?: boolean;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "group/step h-auto min-h-12 flex-col gap-1 rounded-lg px-1.5 py-2 text-[0.8rem] text-muted-foreground sm:flex-row sm:gap-2 sm:px-3 sm:text-sm",
        "hover:bg-muted/70 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums",
          done ? "border-success bg-success text-white" : "border-current/30",
          "group-data-[state=active]/step:border-primary-foreground/40 group-data-[state=active]/step:bg-primary-foreground/15 group-data-[state=active]/step:text-primary-foreground",
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : number ? number : <Icon className="size-3.5" />}
      </span>
      <span className="flex items-center gap-1.5">{children}</span>
    </TabsTrigger>
  );
}
