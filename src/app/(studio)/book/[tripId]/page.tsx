import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/features/auth/session";
import { demoTrip } from "@/features/editor/demo";
import { buildBookBrief, scratchBrief } from "@/features/book/brief";
import { getTemplate } from "@/features/book/templates";
import { BookSkeleton, BookStudio } from "@/features/book/ui/book-studio";
import { getOwnedTrip } from "@/features/trips/queries";
import { isDemoMode } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Photo book designer", robots: { index: false } };

export default function BookPage({ params, searchParams }: PageProps<"/book/[tripId]">) {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <Suspense fallback={<BookSkeleton />}>
        <BookLoader params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BookLoader({ params, searchParams }: Pick<PageProps<"/book/[tripId]">, "params" | "searchParams">) {
  const { tripId } = await params;
  const query = await searchParams;
  const template = typeof query.template === "string" && getTemplate(query.template) ? query.template : null;
  const project = typeof query.p === "string" && /^[\w-]{4,80}$/.test(query.p) ? query.p : null;
  const qs = new URLSearchParams();
  if (template) qs.set("template", template);
  if (project) qs.set("p", project);
  const here = `/book/${tripId}${qs.size ? `?${qs}` : ""}`;

  if (tripId === "scratch") {
    await requireUser(here);
    return <BookStudio brief={scratchBrief()} templateKey={template} projectId={project} backHref="/my-memories" />;
  }
  if (tripId === "demo") {
    if (!isDemoMode()) notFound();
    return <BookStudio brief={buildBookBrief(demoTrip())} templateKey={template} projectId={project} backHref="/editor/demo" />;
  }
  const { user, supabase } = await requireUser(here);
  const trip = await getOwnedTrip(supabase, user.id, tripId);
  if (!trip) notFound();
  return <BookStudio key={trip.id} brief={buildBookBrief(trip)} templateKey={template} projectId={project} backHref={`/editor/${trip.id}`} />;
}
