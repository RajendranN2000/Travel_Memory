"use client";

import { BookOpen, Copy, PencilLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTemplate } from "@/features/book/templates";
import type { useLocalBooks } from "@/features/book/use-local-books";
import type { BookMeta } from "@/features/book/storage";
import type { TripItem } from "./trip-tabs";

type Books = ReturnType<typeof useLocalBooks>;

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function BookCard({ book, item, onDuplicate, onDelete }: { book: BookMeta; item: TripItem | undefined; onDuplicate: () => Promise<void>; onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const template = getTemplate(book.templateKey);
  const cover = item?.trip.coverUrl ?? item?.fallbackImage ?? null;
  const href = `/book/${book.tripId}?p=${encodeURIComponent(book.id)}`;
  const ratio = book.widthMm / book.heightMm;
  return (
    <article className="flex flex-col overflow-hidden card-glow rounded-2xl border border-border bg-card shadow-soft">
      <Link href={href} aria-label={`Open ${book.title || "book"}`} className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-secondary/60 focus-visible:outline-offset-[-4px]" style={item ? { backgroundColor: item.swatch } : undefined}>
        {/* A closed book: the page shape of this book, with the memory's cover photo on it. */}
        <span className="relative block overflow-hidden rounded-[3px] bg-white shadow-print ring-1 ring-black/10" style={{ height: "78%", aspectRatio: ratio }}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URLs
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <BookOpen aria-hidden className="absolute inset-0 m-auto size-7 text-muted-foreground" />
          )}
          <span aria-hidden className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent" />
        </span>
        <Badge variant="overlay" className="absolute top-3 left-3">{book.kind === "magazine" ? "Magazine" : book.kind === "print" ? "Print" : "Photo book"}</Badge>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow text-muted-foreground">{template?.name ?? "Photo book"}</p>
        <h2 className="mt-1 font-display text-xl leading-snug">{book.title || "Untitled book"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {book.pageCount} pages · {book.widthMm}×{book.heightMm} mm · {dateFormat.format(book.updatedAt)}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button asChild size="sm">
            <Link href={href}>
              <PencilLine data-icon="inline-start" /> Edit book
            </Link>
          </Button>
          <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={`Duplicate ${book.title}`} onClick={async () => {
            setBusy(true);
            try {
              await onDuplicate();
              toast.success("Book duplicated");
            } finally {
              setBusy(false);
            }
          }} disabled={busy}>
            <Copy />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Delete ${book.title}`} onClick={() => setConfirm(true)}>
            <Trash2 />
          </Button>
        </div>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>This removes the book and the photos kept for it from this browser. Your memory and any PDFs you downloaded aren&apos;t affected. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await onDelete();
                  toast.success("Book deleted");
                } catch {
                  toast.error("The book couldn't be deleted.");
                  setBusy(false);
                }
              }}
            >
              Delete book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

/** The "Books" tab: photo books and magazines being designed, saved to your account. */
export function BooksPanel({ items, books }: { items: TripItem[]; books: Books }) {
  const byTrip = new Map(items.map((i) => [i.trip.id, i]));
  const withPhotos = items.filter((i) => i.trip.photoCount > 0);

  if (!books.loaded) {
    return (
      <ul aria-busy aria-label="Loading your books" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-lg border border-border">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      {books.unavailable ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This browser isn&apos;t letting us keep books (private browsing can do this). You can still design and download a PDF in one sitting.
        </p>
      ) : null}
      {books.books.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input px-4 py-12 text-center">
          <BookOpen aria-hidden className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-2xl">No books yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Turn a memory into a photo book or travel magazine, then download a print-ready PDF.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {withPhotos.length > 0 ? (
              <Button asChild>
                <Link href={`/book/${withPhotos[0].trip.id}`}>
                  <BookOpen data-icon="inline-start" /> Create a book from “{withPhotos[0].trip.title || "your latest memory"}”
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/photo-books/start">Start a book</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/photo-books">Browse book designs</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Books">
          {books.books.map((b) => (
            <li key={b.id}>
              <BookCard book={b} item={byTrip.get(b.tripId)} onDuplicate={() => books.duplicate(b.id)} onDelete={() => books.remove(b.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
