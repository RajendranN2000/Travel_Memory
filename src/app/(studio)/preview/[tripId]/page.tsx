import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/features/auth/session";
import type { MemoryContent } from "@/features/memories/types";
import { MemoryRenderer } from "@/features/templates/render";
import { getOwnedTrip } from "@/features/trips/queries";

export const metadata: Metadata = { title: "Draft preview", robots: { index: false, follow: false } };

export default function PreviewPage({ params }: PageProps<"/preview/[tripId]">) {
  return (
    <Suspense
      fallback={
        <main id="main" aria-busy className="flex-1">
          <Skeleton className="h-12 w-full rounded-none" />
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
        </main>
      }
    >
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Pick<PageProps<"/preview/[tripId]">, "params">) {
  const { tripId } = await params;
  const { user, supabase } = await requireUser(`/preview/${tripId}`);
  const trip = await getOwnedTrip(supabase, user.id, tripId);
  if (!trip) notFound();

  const memory: MemoryContent = {
    title: trip.title,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    destinationSlug: trip.destinationSlug,
    templateSlug: trip.templateSlug,
    layout: trip.layout,
    palette: trip.palette,
    photos: trip.photos.map((p) => ({
      id: p.id,
      src: p.url,
      width: p.width,
      height: p.height,
      caption: p.caption,
      location: p.location,
      takenOn: p.takenOn,
    })),
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-ink text-paper">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-3 px-3 py-2 sm:px-6">
          <Button asChild size="sm" variant="ghost" className="text-paper hover:bg-paper/10 hover:text-paper">
            <Link href={`/editor/${trip.id}`}>
              <ArrowLeft data-icon="inline-start" /> Back to editor
            </Link>
          </Button>
          <p className="ml-auto flex items-center gap-1.5 text-xs text-paper/80 sm:text-sm">
            <Lock aria-hidden className="size-3.5" /> Draft preview, only visible to you
          </p>
        </div>
      </header>
      <main id="main" className="flex-1">
        <MemoryRenderer memory={memory} priority />
      </main>
    </>
  );
}
