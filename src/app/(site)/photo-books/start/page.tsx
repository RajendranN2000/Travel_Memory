import { ArrowRight, BookOpen, ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageIntro } from "@/components/site/page-intro";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/features/auth/session";
import { getTemplate, TEMPLATES } from "@/features/book/templates";
import { listOwnedTrips } from "@/features/trips/queries";
import { resolveTheme } from "@/features/themes/registry";

export const metadata: Metadata = { title: "Start a photo book", robots: { index: false } };

export default function StartPage({ searchParams }: PageProps<"/photo-books/start">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div aria-busy className="space-y-6 pt-16">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/photo-books/start">, "searchParams">) {
  const query = await searchParams;
  const templateKey = typeof query.template === "string" && getTemplate(query.template) ? query.template : TEMPLATES[0].key;
  const template = getTemplate(templateKey)!;
  const { user, supabase } = await requireUser(`/photo-books/start?template=${templateKey}`);
  const trips = await listOwnedTrips(supabase, user.id);
  const withPhotos = trips.filter((t) => t.photoCount > 0);

  return (
    <>
      <PageIntro eyebrow={`Photo book · ${template.name}`} title="What should the book be made from?">
        Pick a memory to use its photos, title, dates and colours, or start from scratch and add your own photos. Your original memory is never changed.
      </PageIntro>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {withPhotos.map((trip) => {
          const { theme, palette } = resolveTheme(trip.destinationSlug);
          return (
            <li key={trip.id}>
              <Link href={`/book/${trip.id}?template=${templateKey}`} className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-shadow hover:shadow-lifted focus-visible:outline-offset-4">
                <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: palette.secondary }}>
                  {trip.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URLs
                    <img src={trip.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <ImageIcon aria-hidden className="absolute inset-0 m-auto size-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="eyebrow text-muted-foreground">{theme.name}</p>
                  <h2 className="mt-1 font-display text-xl leading-snug">{trip.title || "Untitled trip"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {trip.photoCount} {trip.photoCount === 1 ? "photo" : "photos"}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                    Use this memory <ArrowRight aria-hidden className="size-4" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
        <li>
          <Link href={`/book/scratch?template=${templateKey}`} className="flex h-full min-h-60 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-input bg-card p-6 text-center transition-colors hover:border-foreground/40 focus-visible:outline-offset-4">
            <BookOpen aria-hidden className="size-8 text-brand" />
            <span className="font-display text-xl">Start from scratch</span>
            <span className="text-sm text-muted-foreground">Add your own photos and write your own words.</span>
          </Link>
        </li>
      </ul>
      {withPhotos.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          You don&apos;t have a memory with photos yet. Start from scratch, or{" "}
          <Link href="/create" className="underline underline-offset-2 hover:text-foreground">
            create a memory
          </Link>{" "}
          first.
        </p>
      ) : null}
    </>
  );
}
