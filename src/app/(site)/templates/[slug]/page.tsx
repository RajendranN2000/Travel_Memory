import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageIntro } from "@/components/site/page-intro";
import { Skeleton } from "@/components/ui/skeleton";
import { sampleMemories } from "@/features/memories/samples";
import { getTemplate, templates } from "@/features/templates/registry";
import { listDestinationThemes } from "@/features/themes/registry";
import { TemplatePreviewer } from "./template-previewer";

export function generateStaticParams() {
  return templates.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/templates/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplate(slug);
  return template ? { title: `${template.name} template`, description: template.summary } : { title: "Template not found" };
}

export default function TemplatePage({ params }: PageProps<"/templates/[slug]">) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <Suspense fallback={<PreviewSkeleton />}>
        <TemplateDetail params={params} />
      </Suspense>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div aria-busy className="space-y-6 pt-16">
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-[40rem] w-full" />
    </div>
  );
}

async function TemplateDetail({ params }: Pick<PageProps<"/templates/[slug]">, "params">) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  const destinations = listDestinationThemes().map((t) => ({ slug: t.slug, name: t.name, swatch: t.palettes[0].primary }));
  const samples = Object.fromEntries(sampleMemories.map((s) => [s.content.destinationSlug, s.content]));

  return (
    <>
      <nav aria-label="Breadcrumb" className="pt-8 text-sm text-muted-foreground">
        <Link href="/templates" className="inline-flex min-h-11 items-center hover:text-foreground">
          ← All templates
        </Link>
      </nav>
      <PageIntro eyebrow={`${template.family} template`} title={template.name} className="pt-4">
        {template.summary} Works best with {template.photoRange[0]}–{template.photoRange[1]} photos.
      </PageIntro>
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <TemplatePreviewer template={template} samples={samples} destinations={destinations} />
      </Suspense>
    </>
  );
}
