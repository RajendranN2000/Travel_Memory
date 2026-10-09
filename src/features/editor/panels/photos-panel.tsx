"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, ArrowDown, ArrowUp, GripVertical, ImagePlus, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState, type DragEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ACCEPTED_INPUT_TYPES, LIMITS } from "@/features/trips/schemas";
import type { EditorPhoto } from "@/features/trips/types";
import type { UploadItem } from "../use-uploads";

type PhotoField = "caption" | "location" | "takenOn";

export interface PhotosPanelProps {
  photos: EditorPhoto[];
  uploads: UploadItem[];
  demo: boolean;
  onFiles: (files: File[]) => void;
  onRetryUpload: (localId: string) => void;
  onRemoveUpload: (localId: string) => void;
  onReorder: (from: number, to: number) => void;
  onChangePhoto: (id: string, field: PhotoField, value: string | null) => void;
  onDeletePhoto: (id: string) => void;
}

export function PhotosPanel(props: PhotosPanelProps) {
  const { photos, uploads, onReorder } = props;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((p) => p.id === active.id);
    const to = photos.findIndex((p) => p.id === over.id);
    if (from >= 0 && to >= 0) onReorder(from, to);
  };

  const label = (id: string | number) => {
    const index = photos.findIndex((p) => p.id === id);
    const caption = photos[index]?.caption;
    return `photo ${index + 1}${caption ? ` (${caption})` : ""}`;
  };

  return (
    <div className="space-y-6">
      <Dropzone {...props} />

      <AnimatePresence initial={false}>
        {uploads.length > 0 ? (
          <motion.ul
            key="uploads"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
            aria-label="Uploads in progress"
          >
            {uploads.map((u) => (
              <UploadRow key={u.localId} item={u} onRetry={props.onRetryUpload} onRemove={props.onRemoveUpload} />
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>

      {photos.length === 0 && uploads.length === 0 ? (
        <p className="rounded-md border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
          No photos yet. The first photo you add becomes the cover.
        </p>
      ) : null}

      {photos.length > 0 ? (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-semibold">
              Your photos <span className="font-normal text-muted-foreground">({photos.length}/{LIMITS.photosPerTrip})</span>
            </h3>
            <p className="text-xs text-muted-foreground">Drag to reorder · first is the cover</p>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            accessibility={{
              screenReaderInstructions: {
                draggable: "To reorder, press space or enter on the handle, use the arrow keys to move, and press space or enter again to drop.",
              },
              announcements: {
                onDragStart: ({ active }) => `Picked up ${label(active.id)}.`,
                onDragOver: ({ active, over }) => (over ? `${label(active.id)} is over position ${photos.findIndex((p) => p.id === over.id) + 1}.` : undefined),
                onDragEnd: ({ active, over }) => (over ? `Dropped ${label(active.id)} at position ${photos.findIndex((p) => p.id === over.id) + 1}.` : "Dropped."),
                onDragCancel: ({ active }) => `Cancelled moving ${label(active.id)}.`,
              },
            }}
          >
            <SortableContext items={photos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-3">
                {photos.map((photo, index) => (
                  <SortablePhoto key={photo.id} photo={photo} index={index} count={photos.length} {...props} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
      ) : null}
    </div>
  );
}

function Dropzone({ onFiles, demo, photos, uploads }: PhotosPanelProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const full = photos.length + uploads.length >= LIMITS.photosPerTrip;

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (full) return;
    onFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!full) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        over ? "border-brand bg-brand/5" : "border-input bg-card",
        full && "opacity-60",
      )}
    >
      <ImagePlus aria-hidden className="mx-auto size-7 text-brand" />
      <p className="mt-3 font-medium">Add photos</p>
      <p className="mt-1 text-sm text-muted-foreground">
        JPEG, PNG or WebP, up to {Math.round(LIMITS.maxInputBytes / 1024 / 1024)} MB each. Photos are resized and location data
        is removed before upload.
      </p>
      {demo ? <p className="mt-2 text-sm font-medium text-warning">Demo mode: photos stay in this tab and aren&apos;t uploaded.</p> : null}
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple
        accept={ACCEPTED_INPUT_TYPES.join(",")}
        className="sr-only"
        disabled={full}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <Button type="button" className="mt-4" onClick={() => input.current?.click()} disabled={full}>
        {full ? "Photo limit reached" : "Choose photos"}
      </Button>
      <p className="mt-2 hidden text-xs text-muted-foreground md:block">or drag and drop them here</p>
    </div>
  );
}

const STATUS_TEXT: Record<UploadItem["status"], string> = {
  queued: "Waiting…",
  processing: "Preparing photo…",
  uploading: "Uploading…",
  saving: "Saving…",
  error: "Upload failed",
};

function UploadRow({ item, onRetry, onRemove }: { item: UploadItem; onRetry: (id: string) => void; onRemove: (id: string) => void }) {
  const failed = item.status === "error";
  return (
    <li className={cn("flex items-center gap-3 rounded-md border bg-card p-2 pr-1", failed ? "border-destructive/40" : "border-border")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- temporary local preview */}
      <img src={item.previewUrl} alt="" className="size-14 shrink-0 rounded object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className={cn("flex items-center gap-1.5 text-xs", failed ? "text-destructive" : "text-muted-foreground")} role={failed ? "alert" : "status"}>
          {failed ? <AlertCircle aria-hidden className="size-3.5 shrink-0" /> : <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin" />}
          <span className="line-clamp-2">{failed ? (item.error ?? STATUS_TEXT.error) : STATUS_TEXT[item.status]}</span>
        </p>
      </div>
      {failed ? (
        <Button size="icon-sm" variant="ghost" onClick={() => onRetry(item.localId)} aria-label={`Retry ${item.name}`}>
          <RotateCcw />
        </Button>
      ) : null}
      {failed || item.status === "queued" ? (
        <Button size="icon-sm" variant="ghost" onClick={() => onRemove(item.localId)} aria-label={`Remove ${item.name}`}>
          <X />
        </Button>
      ) : null}
    </li>
  );
}

function SortablePhoto({
  photo,
  index,
  count,
  onReorder,
  onChangePhoto,
  onDeletePhoto,
}: PhotosPanelProps & { photo: EditorPhoto; index: number; count: number }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const base = `photo-${photo.id}`;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative rounded-lg border border-border bg-card p-3",
        isDragging && "z-10 shadow-lifted ring-2 ring-brand",
      )}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="grid size-11 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label={`Reorder photo ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden className="size-5" />
          </button>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{index + 1}</span>
        </div>
        <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted sm:size-28">
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed or local preview URL
            <img src={photo.url} alt={photo.caption || `Photo ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full place-items-center p-2 text-center text-xs text-muted-foreground">Preview unavailable</span>
          )}
          {index === 0 ? (
            <span className="absolute top-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white uppercase">
              Cover
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={`${base}-caption`} className="sr-only">
            Caption for photo {index + 1}
          </Label>
          <Textarea
            id={`${base}-caption`}
            value={photo.caption}
            maxLength={LIMITS.caption}
            rows={2}
            placeholder="Add a caption"
            className="min-h-0 resize-none py-2 text-sm"
            onChange={(e) => onChangePhoto(photo.id, "caption", e.target.value)}
          />
          <Label htmlFor={`${base}-location`} className="sr-only">
            Place for photo {index + 1}
          </Label>
          <Input
            id={`${base}-location`}
            value={photo.location}
            maxLength={LIMITS.location}
            placeholder="Place (optional)"
            className="h-10 text-sm"
            onChange={(e) => onChangePhoto(photo.id, "location", e.target.value)}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
        <Label htmlFor={`${base}-date`} className="text-xs font-normal text-muted-foreground">
          Day
        </Label>
        <Input
          id={`${base}-date`}
          type="date"
          value={photo.takenOn ?? ""}
          className="h-10 w-auto text-sm"
          onChange={(e) => onChangePhoto(photo.id, "takenOn", e.target.value || null)}
        />
        <div className="ml-auto flex items-center">
          <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => onReorder(index, index - 1)} aria-label={`Move photo ${index + 1} up`}>
            <ArrowUp />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={index === count - 1}
            onClick={() => onReorder(index, index + 1)}
            aria-label={`Move photo ${index + 1} down`}
          >
            <ArrowDown />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Delete photo ${index + 1}`}>
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
                <AlertDialogDescription>
                  It will be removed from this trip, from storage and from the published memory if it appears there. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep photo</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => onDeletePhoto(photo.id)}>
                  Delete photo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </li>
  );
}
