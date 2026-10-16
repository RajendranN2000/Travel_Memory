"use client";

import { BookOpen, Copy, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTemplate } from "../templates";
import type { BookStudioApi } from "./use-book-studio";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** The books saved in this browser: open, duplicate or delete them. */
export function ProjectsDialog({ studio, open, onOpenChange, onNew }: { studio: BookStudioApi; open: boolean; onOpenChange: (o: boolean) => void; onNew: () => void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const { refreshBooks } = studio;
  useEffect(() => {
    if (open) void refreshBooks();
  }, [open, refreshBooks]);
  const target = studio.books.find((b) => b.id === confirm);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] gap-3 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Your books</DialogTitle>
          <DialogDescription>Saved in this browser only. A downloaded PDF is independent of these projects.</DialogDescription>
        </DialogHeader>
        {studio.books.length === 0 ? (
          <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">No saved books yet. Yours will appear here after the first autosave.</p>
        ) : (
          <ul className="space-y-2">
            {studio.books.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <BookOpen aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {b.title || "Untitled book"} {b.id === studio.project.id ? <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] text-primary">Open</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getTemplate(b.templateKey)?.name ?? "Book"} · {b.pageCount} pages · {b.widthMm}×{b.heightMm} mm · {when.format(b.updatedAt)}
                  </p>
                </div>
                {b.id !== studio.project.id ? (
                  <Button size="xs" variant="secondary" onClick={async () => { await studio.openProject(b.id); onOpenChange(false); }}>
                    Open
                  </Button>
                ) : null}
                <Button size="icon-xs" variant="ghost" aria-label={`Duplicate ${b.title}`} onClick={async () => {
                  if (b.id === studio.project.id) await studio.duplicateProject();
                  else {
                    const { duplicateBook } = await import("../storage");
                    await duplicateBook(b.id);
                    await refreshBooks();
                  }
                }}>
                  <Copy />
                </Button>
                <Button size="icon-xs" variant="ghost" aria-label={`Delete ${b.title}`} onClick={() => setConfirm(b.id)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => { onOpenChange(false); onNew(); }}>
            Start a new book
          </Button>
        </div>
        <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &ldquo;{target?.title || "this book"}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>This removes the book and the photos kept for it from this browser. Downloaded PDFs aren&apos;t affected. This can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (confirm) await studio.removeProject(confirm);
                  setConfirm(null);
                }}
              >
                Delete book
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
