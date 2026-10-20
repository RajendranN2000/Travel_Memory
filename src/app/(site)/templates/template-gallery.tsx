"use client";

import { ArrowRight, BookOpen, Clapperboard } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MotionProvider } from "@/components/motion/motion-provider";
import { TemplateThumbnail } from "@/components/memory/template-thumbnail";
import { DestinationChips, type DestinationOption } from "@/components/memory/destination-picker";
import { bookTemplateFor } from "@/features/book/templates";
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
    <MotionProvider>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="theme-label" className="text-sm font-medium text-muted-foreground">
          Preview every template in a destination theme
        </p>
        <DestinationChips options={destinations} value={destination} onChange={setDestination} />
      </div>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {templates.map((template) => (
          <li key={template.slug} className="lift flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <motion.div key={`${template.slug}-${destination}`} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="p-3 pb-0">
              {sample ? (
                <TemplateThumbnail
                  memory={{ ...sample, templateSlug: template.slug, layout: template.layouts[0].key, palette: null }}
                  height="h-[26rem]"
                />
              ) : null}
            </motion.div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl leading-tight">{template.name}</h2>
                <span className="mt-1 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">{template.family}</span>
              </div>
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{template.summary}</p>
              <p className="mt-auto pt-1 text-sm">
                <span className="text-muted-foreground">Best for:</span> {template.bestFor}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 border-t border-border bg-muted/30 p-4">
              <Button asChild size="lg" className="group/cta col-span-2">
                <Link href={`/templates/${template.slug}?destination=${destination}`}>
                  Preview template <ArrowRight aria-hidden className="transition-transform duration-300 group-hover/cta:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="group/video h-12 flex-col gap-0 rounded-2xl border-[#7c5cff]/25 bg-[#7c5cff]/8 text-[#5b3fd6] hover:border-[#7c5cff]/60 hover:bg-[#7c5cff]/15 hover:text-[#5b3fd6] dark:text-[#b8a4ff] dark:hover:text-[#cdbfff]"
              >
                <Link href={`/create?template=${template.slug}&destination=${destination}&intent=reel`}>
                  <Clapperboard aria-hidden className="size-[1.1rem] transition-transform duration-300 group-hover/video:scale-110 group-hover/video:-rotate-6" />
                  <span className="text-xs font-semibold">Make a video</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="group/book h-12 flex-col gap-0 rounded-2xl border-[#10b981]/30 bg-[#10b981]/8 text-[#0b8a62] hover:border-[#10b981]/60 hover:bg-[#10b981]/15 hover:text-[#0b8a62] dark:text-[#6ee7b7] dark:hover:text-[#9ff0cf]"
              >
                <Link href={`/photo-books/start?template=${bookTemplateFor(template.slug)}`}>
                  <BookOpen aria-hidden className="size-[1.1rem] transition-transform duration-300 group-hover/book:scale-110 group-hover/book:rotate-6" />
                  <span className="text-xs font-semibold">Photo book</span>
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </MotionProvider>
  );
}
