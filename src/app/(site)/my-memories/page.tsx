import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageIntro } from "@/components/site/page-intro";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/features/auth/session";
import { resolveTheme } from "@/features/themes/registry";
import { ThemeIllustration } from "@/features/themes/illustration";
import { listOwnedTrips } from "@/features/trips/queries";
import { TripCard } from "./trip-card";

export const metadata: Metadata = { title: "My memories", robots: { index: false } };

export default function MyMemoriesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <PageIntro
        eyebrow="Your studio"
        title="My memories"
        actions={
          <Button asChild size="lg">
            <Link href="/create">
              <Plus data-icon="inline-start" /> New memory
            </Link>
          </Button>
        }
      >
        Drafts are private to you. Published memories show who can see them.
      </PageIntro>
      <Suspense fallback={<ListSkeleton />}>
        <TripList />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul aria-busy aria-label="Loading your memories" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-lg border border-border">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function TripList() {
  const { user, supabase } = await requireUser("/my-memories");
  const trips = await listOwnedTrips(supabase, user.id);

  if (trips.length === 0) {
    const resolved = resolveTheme("munnar");
    return (
      <div className="grid items-center gap-10 rounded-lg border border-dashed border-input bg-card p-6 sm:p-10 md:grid-cols-2">
        <div className="relative aspect-[16/10] overflow-hidden rounded-md">
          <ThemeIllustration theme={resolved.theme} palette={resolved.palette} className="absolute inset-0 h-full w-full" />
        </div>
        <div>
          <h2 className="font-display text-3xl">No memories yet</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Pick a destination, choose a template and add a few favourite photos. Your draft stays private until you
            decide to publish it.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/create">Create your first memory</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/templates">Browse templates</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => {
        const resolved = resolveTheme(trip.destinationSlug);
        return (
          <li key={trip.id}>
            <TripCard
              trip={trip}
              destinationName={resolved.theme.name}
              swatch={resolved.palette.secondary}
              fallbackImage={resolved.hero?.src ?? null}
            />
          </li>
        );
      })}
    </ul>
  );
}
