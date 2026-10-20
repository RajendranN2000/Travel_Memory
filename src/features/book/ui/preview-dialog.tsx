"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookFlip } from "./book-flip";
import type { BookStudioApi } from "./use-book-studio";

/** Open the book like a real one: a closed cover, pages that turn, facing spreads and a back cover. */
export function PreviewDialog({ studio, open, onOpenChange }: { studio: BookStudioApi; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96svh] gap-3 overflow-y-auto sm:max-w-[min(96vw,1180px)]">
        <DialogHeader>
          <DialogTitle>Preview: {studio.project.title || "Your book"}</DialogTitle>
          <DialogDescription>Click a page, swipe or use the arrow keys to turn it. Shown at trimmed size, without bleed.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so it always starts on the page being edited. */}
        {open ? <BookFlip studio={studio} startPage={studio.pageIndex} /> : null}
      </DialogContent>
    </Dialog>
  );
}
