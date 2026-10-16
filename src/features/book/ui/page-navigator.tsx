"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, FilePlus2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BookPage } from "../types";
import { PageView } from "./page-view";
import type { BookStudioApi } from "./use-book-studio";

const THUMB_H = 92;

/** Draws the thumbnail only once it scrolls into view, so a 100-page book opens quickly. */
function LazyThumb({ studio, page, index }: { studio: BookStudioApi; page: BookPage; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const s = studio.project.settings;
  const w = (THUMB_H * s.widthMm) / s.heightMm;
  return (
    <div ref={ref} className="overflow-hidden bg-white" style={{ width: w, height: THUMB_H }}>
      {seen ? <PageView render={studio.renderOf(page, index)} images={studio.images} pxPerMm={THUMB_H / s.heightMm} /> : null}
    </div>
  );
}

function Thumb({ studio, page, index, onDelete }: { studio: BookStudioApi; page: BookPage; index: number; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const selected = studio.selection.pageId === page.id;
  const issues = studio.issues.filter((i) => i.pageId === page.id && i.severity !== "info");
  const problem = issues.some((i) => i.severity === "error");
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }} className="group relative shrink-0 list-none">
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label={`Page ${index + 1}, ${page.kind}${issues.length ? `, ${issues.length} warning${issues.length === 1 ? "" : "s"}` : ""}${selected ? ", selected" : ""}. Press space to pick up and move.`}
        aria-pressed={selected}
        onClick={() => studio.selectElement(page.id, null)}
        onFocus={() => studio.selectElement(page.id, null)}
        className={cn("cursor-grab touch-none overflow-hidden rounded-sm outline-none ring-offset-1 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing", selected ? "ring-2 ring-primary" : "ring-1 ring-border hover:ring-foreground/40", isDragging && "opacity-80 shadow-xl")}
      >
        <LazyThumb studio={studio} page={page} index={index} />
      </div>
      <span className="mt-1 block text-center text-[0.65rem] text-muted-foreground tabular-nums">{index + 1}</span>
      {issues.length ? (
        <span className={cn("absolute top-1 left-1 grid size-4 place-items-center rounded-full text-white", problem ? "bg-destructive" : "bg-warning")} title={issues[0].message}>
          <TriangleAlert className="size-2.5" aria-hidden />
        </span>
      ) : null}
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" aria-label={`Duplicate page ${index + 1}`} onClick={() => studio.duplicatePageById(page.id)} className="grid size-5 place-items-center rounded bg-black/70 text-white outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Copy className="size-3" />
        </button>
        <button type="button" aria-label={`Delete page ${index + 1}`} onClick={() => onDelete(page.id)} className="grid size-5 place-items-center rounded bg-black/70 text-white outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Trash2 className="size-3" />
        </button>
      </div>
    </li>
  );
}

export function PageNavigator({ studio, onOpenPages }: { studio: BookStudioApi; onOpenPages: () => void }) {
  const { project } = studio;
  const [toDelete, setToDelete] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = project.pages.map((p) => p.id);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from >= 0 && to >= 0) studio.movePageTo(from, to);
  };
  const pending = toDelete ? project.pages.findIndex((p) => p.id === toDelete) : -1;

  return (
    <section aria-label="Pages" className="border-t border-border bg-card/70">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <p className="mr-auto text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Pages</span> · {project.pages.length} · {project.settings.widthMm} × {project.settings.heightMm} mm each
        </p>
        <Button size="xs" variant="secondary" onClick={() => studio.addPageAfter("photo-only")}>
          <Plus data-icon="inline-start" /> Add page
        </Button>
        <Button size="xs" variant="ghost" onClick={() => studio.addPageAfter(null, "blank")}>
          <FilePlus2 data-icon="inline-start" /> Blank
        </Button>
        <Button size="xs" variant="ghost" className="hidden sm:inline-flex" onClick={onOpenPages}>
          Page list
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <ol className="flex gap-3 overflow-x-auto px-3 pt-1 pb-2">
            {project.pages.map((page, i) => (
              <Thumb key={page.id} studio={studio} page={page} index={i} onDelete={setToDelete} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page {pending + 1}?</AlertDialogTitle>
            <AlertDialogDescription>The page and everything on it will be removed from this book. You can undo this straight afterwards.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep page</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) studio.deletePageById(toDelete);
                setToDelete(null);
              }}
            >
              Delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
