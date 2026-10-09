import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/features/auth/session";
import { demoTrip } from "@/features/editor/demo";
import { Editor } from "@/features/editor/editor";
import { getOwnedTrip } from "@/features/trips/queries";
import { isDemoMode } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Editor", robots: { index: false } };

export default function EditorPage({ params, searchParams }: PageProps<"/editor/[tripId]">) {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <Suspense fallback={<EditorSkeleton />}>
        <EditorLoader params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EditorLoader({ params, searchParams }: PageProps<"/editor/[tripId]">) {
  const { tripId } = await params;
  // Set by the full preview's "Publish" button.
  const openPublish = (await searchParams).publish === "1";
  if (tripId === "demo") {
    if (!isDemoMode()) notFound();
    return <Editor trip={demoTrip()} userId={null} demo openPublish={openPublish} />;
  }
  const { user, supabase } = await requireUser(`/editor/${tripId}`);
  const trip = await getOwnedTrip(supabase, user.id, tripId);
  if (!trip) notFound();
  return <Editor key={trip.id} trip={trip} userId={user.id} demo={false} openPublish={openPublish} />;
}

function EditorSkeleton() {
  return (
    <div aria-busy aria-label="Loading editor" className="flex flex-1 flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Skeleton className="size-10" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="ml-auto h-11 w-28" />
      </div>
      <div className="grid flex-1 gap-10 p-5 lg:grid-cols-[32rem_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="hidden h-[70svh] lg:block" />
      </div>
    </div>
  );
}
