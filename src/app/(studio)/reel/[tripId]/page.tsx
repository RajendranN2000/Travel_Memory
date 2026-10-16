import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/features/auth/session";
import { demoTrip } from "@/features/editor/demo";
import { buildBrief } from "@/features/reel/brief";
import { ReelStudio, StudioSkeleton } from "@/features/reel/ui/reel-studio";
import { getOwnedTrip } from "@/features/trips/queries";
import { isDemoMode } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Create reel", robots: { index: false } };

export default function ReelPage({ params }: PageProps<"/reel/[tripId]">) {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <Suspense fallback={<StudioSkeleton />}>
        <ReelLoader params={params} />
      </Suspense>
    </main>
  );
}

async function ReelLoader({ params }: Pick<PageProps<"/reel/[tripId]">, "params">) {
  const { tripId } = await params;
  if (tripId === "demo") {
    if (!isDemoMode()) notFound();
    return <ReelStudio brief={buildBrief(demoTrip())} demo />;
  }
  const { user, supabase } = await requireUser(`/reel/${tripId}`);
  const trip = await getOwnedTrip(supabase, user.id, tripId);
  if (!trip) notFound();
  return <ReelStudio key={trip.id} brief={buildBrief(trip)} demo={false} />;
}
