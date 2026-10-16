"use client";

import { Clapperboard, Download, Info, Loader2, PencilLine, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/features/reel/config";
import { getReelExportBlob, type ReelDraftSummary, type ReelExportMeta } from "@/features/reel/reel-library";
import type { useLocalReels } from "@/features/reel/use-local-reels";
import { getPreset } from "@/features/reel/presets";
import type { TripItem } from "./trip-tabs";

type Reels = ReturnType<typeof useLocalReels>;

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Poster({ item, children }: { item: TripItem | undefined; children?: React.ReactNode }) {
  const src = item?.trip.coverUrl ?? item?.fallbackImage ?? null;
  return (
    <div className="relative aspect-[9/12] overflow-hidden bg-ink" style={item ? { backgroundColor: item.swatch } : undefined}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URLs
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover opacity-90" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      {children}
    </div>
  );
}

function ExportCard({ reel, item, onDelete }: { reel: ReelExportMeta; item: TripItem | undefined; onDelete: () => Promise<void> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Release the in-memory copy when the card goes away or the video is closed.
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const load = async (): Promise<string | null> => {
    const blob = await getReelExportBlob(reel.id).catch(() => null);
    if (!blob) {
      toast.error("This reel's video is no longer stored in this browser.");
      return null;
    }
    return URL.createObjectURL(blob);
  };

  const play = async () => {
    setLoading(true);
    const next = await load();
    setLoading(false);
    if (next) setUrl(next);
  };

  const download = async () => {
    const next = await load();
    if (!next) return;
    const a = document.createElement("a");
    a.href = next;
    a.download = reel.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(next), 10_000);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      {url ? (
        <video src={url} controls autoPlay playsInline className="aspect-[9/12] w-full bg-black object-contain" aria-label={`Reel: ${reel.title}`} />
      ) : (
        <Poster item={item}>
          <button
            type="button"
            onClick={play}
            disabled={loading}
            aria-label={`Play reel ${reel.title}`}
            className="absolute inset-0 grid place-items-center outline-none focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:ring-inset"
          >
            <span className="grid size-14 place-items-center rounded-full bg-white/90 text-ink shadow-lifted transition-transform hover:scale-105">
              {loading ? <Loader2 aria-hidden className="size-6 animate-spin" /> : <Play aria-hidden className="size-6 fill-current" />}
            </span>
          </button>
          <Badge className="absolute top-3 left-3 bg-white/95 text-foreground">{reel.format.toUpperCase()}</Badge>
        </Poster>
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow text-muted-foreground">{item?.destinationName ?? reel.tripTitle}</p>
        <h2 className="mt-1 font-display text-xl leading-snug">{reel.title || reel.tripTitle || "Untitled reel"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDuration(reel.durationMs)} · {reel.width}×{reel.height} · {(reel.sizeBytes / 1_000_000).toFixed(1)} MB · {dateFormat.format(reel.createdAt)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={download}>
            <Download data-icon="inline-start" /> Download
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/reel/${reel.tripId}`}>
              <PencilLine data-icon="inline-start" /> Edit reel
            </Link>
          </Button>
          <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={`Delete reel ${reel.title}`} onClick={() => setConfirm(true)}>
            <Trash2 />
          </Button>
        </div>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reel?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the video kept in this browser. Your memory and photos aren&apos;t affected, and you can render the reel again from its editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={async (e) => {
                e.preventDefault();
                setRemoving(true);
                try {
                  await onDelete();
                  toast.success("Reel deleted");
                } catch {
                  toast.error("The reel couldn't be deleted.");
                  setRemoving(false);
                }
              }}
            >
              Delete reel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function DraftCard({ draft, item, onRemove }: { draft: ReelDraftSummary; item: TripItem; onRemove: () => void }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-dashed border-input bg-card">
      <Poster item={item}>
        <Badge variant="secondary" className="absolute top-3 left-3 bg-white/95">
          In progress
        </Badge>
        <Clapperboard aria-hidden className="absolute inset-0 m-auto size-10 text-white/90" />
      </Poster>
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow text-muted-foreground">{item.destinationName}</p>
        <h2 className="mt-1 font-display text-xl leading-snug">{draft.title || item.trip.title || "Untitled reel"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {draft.clipCount} {draft.clipCount === 1 ? "clip" : "clips"} · {formatDuration(draft.durationMs)} · {getPreset(draft.presetKey).name}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button asChild size="sm">
            <Link href={`/reel/${draft.tripId}`}>
              <PencilLine data-icon="inline-start" /> Continue editing
            </Link>
          </Button>
          <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={`Discard draft reel for ${draft.title}`} onClick={onRemove}>
            <Trash2 />
          </Button>
        </div>
      </div>
    </article>
  );
}

/** The "Reels" tab: finished videos and drafts, all kept on this device. */
export function ReelsPanel({ items, reels }: { items: TripItem[]; reels: Reels }) {
  const byTrip = new Map(items.map((i) => [i.trip.id, i]));
  const exportedTrips = new Set(reels.exports.map((e) => e.tripId));
  const drafts = reels.drafts.filter((d) => byTrip.has(d.tripId) && !exportedTrips.has(d.tripId));
  const withPhotos = items.filter((i) => i.trip.photoCount > 0);

  if (!reels.loaded) {
    return (
      <ul aria-busy aria-label="Loading your reels" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-lg border border-border">
            <Skeleton className="aspect-[9/12] rounded-none" />
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
      <p className="flex items-start gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Reels are made and kept in this browser only. They are never uploaded, so they won&apos;t appear on your other devices. Download a reel to keep it safe.
        </span>
      </p>

      {reels.unavailable ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This browser isn&apos;t letting us keep reels (private browsing can do this). You can still create and download them.
        </p>
      ) : null}

      {reels.exports.length === 0 && drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input px-4 py-12 text-center">
          <Clapperboard aria-hidden className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-2xl">No reels yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Turn the photos in any memory into a cinematic video with music, text and transitions. It takes about a minute.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {withPhotos.length > 0 ? (
              <Button asChild>
                <Link href={`/reel/${withPhotos[0].trip.id}`}>
                  <Clapperboard data-icon="inline-start" /> Create a reel from “{withPhotos[0].trip.title || "your latest memory"}”
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/create?intent=reel">Start a memory for a reel</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/reels">How reels work</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Reels">
          {reels.exports.map((reel) => (
            <li key={reel.id}>
              <ExportCard reel={reel} item={byTrip.get(reel.tripId)} onDelete={() => reels.removeExport(reel.id)} />
            </li>
          ))}
          {drafts.map((draft) => (
            <li key={draft.tripId}>
              <DraftCard draft={draft} item={byTrip.get(draft.tripId)!} onRemove={() => reels.removeDraft(draft.tripId)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
