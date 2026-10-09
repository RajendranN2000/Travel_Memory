import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro } from "@/components/site/page-intro";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/features/auth/session";
import { getTemplate, isTemplateSlug } from "@/features/templates/registry";
import { getDestinationImage } from "@/features/themes/images";
import { getDestinationTheme, listDestinationThemes } from "@/features/themes/registry";
import { CreateTripForm } from "./create-trip-form";

export const metadata: Metadata = { title: "Create a memory", robots: { index: false } };

export default function CreatePage({ searchParams }: PageProps<"/create">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
      <PageIntro eyebrow="New memory" title="Start with the basics">
        Choose a destination and template, give the trip a name, then add photos in the editor.
      </PageIntro>
      <Suspense
        fallback={
          <div className="space-y-6" aria-busy>
            <Skeleton className="h-8 w-60" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/5]" />
              ))}
            </div>
          </div>
        }
      >
        <CreateContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CreateContent({ searchParams }: Pick<PageProps<"/create">, "searchParams">) {
  const params = await searchParams;
  const query = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  await requireUser(`/create${query.size ? `?${query}` : ""}`);

  const themes = listDestinationThemes();
  const requestedDestination = typeof params.destination === "string" ? getDestinationTheme(params.destination) : null;
  const destination = requestedDestination ?? themes[0];
  const requestedTemplate = typeof params.template === "string" && isTemplateSlug(params.template) ? params.template : null;
  const templateSlug = requestedTemplate ?? destination.templates[0];
  const template = getTemplate(templateSlug);
  const layout = typeof params.layout === "string" && template?.layouts.some((l) => l.key === params.layout) ? params.layout : undefined;

  return (
    <CreateTripForm
      destinations={themes.map((t) => {
        const img = getDestinationImage(t.heroImage);
        return {
          slug: t.slug,
          name: t.name,
          region: t.region ?? t.country,
          tagline: t.copy.tagline,
          image: img ? { src: img.src, blurDataURL: img.blurDataURL } : null,
          recommendedTemplate: t.templates[0],
        };
      })}
      defaults={{ destinationSlug: destination.slug, templateSlug, layout }}
    />
  );
}
