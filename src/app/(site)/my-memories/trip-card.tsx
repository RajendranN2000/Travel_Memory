"use client";

import { BookOpen, Clapperboard, Copy, ExternalLink, Eye, Loader2, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateRange } from "@/lib/dates";
import { deleteTrip } from "@/features/trips/actions";
import { DuplicateTripDialog } from "@/features/trips/duplicate-dialog";
import type { TripSummary } from "@/features/trips/types";

const VISIBILITY_LABEL = { public: "Public", unlisted: "Unlisted", private: "Private" } as const;

export function TripCard({
  trip,
  destinationName,
  swatch,
  fallbackImage,
}: {
  trip: TripSummary;
  destinationName: string;
  swatch: string;
  fallbackImage: string | null;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [pending, startTransition] = useTransition();
  const dates = formatDateRange(trip.startDate, trip.endDate);

  const remove = () =>
    startTransition(async () => {
      const result = await deleteTrip(trip.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirm(false);
      toast.success("Trip deleted");
      router.refresh();
    });

  return (
    <article className="group card-glow relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: swatch }}>
        {trip.coverUrl || fallbackImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URLs
          <img
            src={trip.coverUrl ?? fallbackImage ?? ""}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${trip.coverUrl ? "" : "opacity-40 grayscale"}`}
          />
        ) : null}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {trip.publication ? (
            <Badge variant="overlay">{VISIBILITY_LABEL[trip.publication.visibility]}</Badge>
          ) : (
            <Badge variant="overlay">
              Draft
            </Badge>
          )}
          {trip.hasUnpublishedChanges ? <Badge variant="overlayWarning">Unpublished changes</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow w-fit rounded-full bg-brand/10 px-2.5 py-1 text-brand">{destinationName}</p>
        <h2 className="mt-1 font-display text-xl leading-snug">
          <Link href={`/editor/${trip.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {trip.title || "Untitled trip"}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {[dates, `${trip.photoCount} ${trip.photoCount === 1 ? "photo" : "photos"}`].filter(Boolean).join(" · ")}
        </p>
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Button asChild size="sm">
            <Link href={`/editor/${trip.id}`}>
              <PencilLine data-icon="inline-start" /> Edit
            </Link>
          </Button>
          {trip.photoCount > 0 ? (
            <Button asChild size="sm" variant="outline" className="border-[#7c5cff]/30 bg-[#7c5cff]/8 text-[#5b3fd6] hover:border-[#7c5cff]/60 hover:bg-[#7c5cff]/15 hover:text-[#5b3fd6] dark:text-[#b8a4ff]">
              <Link href={`/reel/${trip.id}`}>
                <Clapperboard data-icon="inline-start" /> Create Reel
              </Link>
            </Button>
          ) : null}
          {trip.publication ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/memory/${trip.publication.slug}`}>
                <ExternalLink data-icon="inline-start" /> View
              </Link>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={`More actions for ${trip.title || "untitled trip"}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuItem asChild className="min-h-10">
                <Link href={`/preview/${trip.id}`}>
                  <Eye /> Preview draft
                </Link>
              </DropdownMenuItem>
              {trip.photoCount > 0 ? (
                <DropdownMenuItem asChild className="min-h-10">
                  <Link href={`/book/${trip.id}`}>
                    <BookOpen /> Create photo book
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem className="min-h-10" onSelect={() => setDuplicating(true)}>
                <Copy /> Duplicate with another template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="min-h-10" onSelect={() => setConfirm(true)}>
                <Trash2 /> Delete trip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {duplicating ? (
        <DuplicateTripDialog
          tripId={trip.id}
          title={trip.title}
          templateSlug={trip.templateSlug}
          open={duplicating}
          onOpenChange={setDuplicating}
        />
      ) : null}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{trip.title || "Untitled trip"}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the draft, its {trip.photoCount} {trip.photoCount === 1 ? "photo" : "photos"}
              {trip.publication ? " and the published page" : ""}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Delete trip
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
