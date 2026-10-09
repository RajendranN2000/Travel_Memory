"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { TemplateThumbnail } from "@/components/memory/template-thumbnail";
import { DestinationChips, type DestinationOption } from "@/components/memory/destination-picker";
import type { MemoryContent } from "@/features/memories/types";
import type { TemplateDefinition } from "@/features/templates/types";

export function TemplateGallery({
  templates,
  samples,
  destinations,
}: {
  templates: TemplateDefinition[];
  samples: Record<string, MemoryContent>;
  destinations: DestinationOption[];
}) {
  const [destination, setDestination] = useState(destinations[0]?.slug ?? "munnar");
  const sample = samples[destination];

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="theme-label" className="text-sm font-medium text-muted-foreground">
          Preview every template in a destination theme
        </p>
        <DestinationChips options={destinations} value={destination} onChange={setDestination} />
      </div>
      <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
        {templates.map((template) => (
          <li key={template.slug}>
            <motion.div key={`${template.slug}-${destination}`} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
              {sample ? (
                <TemplateThumbnail
                  memory={{ ...sample, templateSlug: template.slug, layout: template.layouts[0].key, palette: null }}
                  height="h-[30rem]"
                />
              ) : null}
            </motion.div>
            <div className="mt-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl">{template.name}</h2>
              <span className="eyebrow text-muted-foreground">{template.family}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{template.summary}</p>
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Best for:</span> {template.bestFor}
            </p>
            <Link
              href={`/templates/${template.slug}?destination=${destination}`}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-brand hover:underline"
            >
              Preview {template.name} <ArrowRight aria-hidden className="size-4" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
