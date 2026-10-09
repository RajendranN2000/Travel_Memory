import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { sampleMemories } from "@/features/memories/samples";
import { templates } from "@/features/templates/registry";
import { listDestinationThemes } from "@/features/themes/registry";
import { TemplateGallery } from "./template-gallery";

export const metadata: Metadata = {
  title: "Templates",
  description: "Poster, journal, collage and timeline templates for your travel memories, each styled by your destination.",
};

export default function TemplatesPage() {
  const destinations = listDestinationThemes().map((t) => ({ slug: t.slug, name: t.name, swatch: t.palettes[0].primary }));
  const samples = Object.fromEntries(sampleMemories.map((s) => [s.content.destinationSlug, s.content]));
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <PageIntro eyebrow="Templates" title="Four ways to tell the story of a trip">
        Every template is responsive and takes its colours, type and photo treatment from your destination. Previews
        use sample photos; yours will take their place.
      </PageIntro>
      <TemplateGallery templates={templates} samples={samples} destinations={destinations} />
    </div>
  );
}
