"use client";

import { ArrowRight, BookOpen, Clapperboard, ImageOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DestinationChips, type DestinationOption } from "@/components/memory/destination-picker";
import { DevicePreview, DeviceToggle, type PreviewDevice } from "@/components/memory/device-preview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { MemoryContent } from "@/features/memories/types";
import { bookTemplateFor } from "@/features/book/templates";
import { MemoryRenderer } from "@/features/templates/render";
import type { TemplateDefinition } from "@/features/templates/types";

export function TemplatePreviewer({
  template,
  samples,
  destinations,
}: {
  template: TemplateDefinition;
  samples: Record<string, MemoryContent>;
  destinations: DestinationOption[];
}) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("destination");
  const initial = destinations.some((d) => d.slug === requested) ? requested! : destinations[0].slug;

  const [destination, setDestination] = useState(initial);
  const [layout, setLayout] = useState(template.layouts[0].key);
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [empty, setEmpty] = useState(false);

  const sample = samples[destination];
  const memory: MemoryContent = {
    ...sample,
    templateSlug: template.slug,
    layout,
    palette: null,
    photos: empty ? [] : sample.photos,
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-8 lg:sticky lg:top-24">
        <div>
          <h2 className="text-sm font-semibold">Destination</h2>
          <DestinationChips className="mt-3" options={destinations} value={destination} onChange={setDestination} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Layout</h2>
          <div role="group" aria-label="Layout" className="mt-3 grid gap-2">
            {template.layouts.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={layout === option.key}
                onClick={() => setLayout(option.key)}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  layout === option.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:border-foreground/30",
                )}
              >
                <span className="block font-medium">{option.name}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-card p-3">
          <Label htmlFor="empty-preview" className="flex items-center gap-2 text-sm font-normal">
            <ImageOff aria-hidden className="size-4 text-muted-foreground" /> Preview with no photos
          </Label>
          <Switch id="empty-preview" checked={empty} onCheckedChange={setEmpty} />
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href={`/create?template=${template.slug}&destination=${destination}&layout=${layout}`}>
            Use this template <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
        <div className="rounded-md border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Clapperboard aria-hidden className="size-4 text-brand" /> Prefer a video?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Give us your photos and a few words and we&apos;ll turn them into a cinematic reel with this template&apos;s colours and type, plus music and text.
          </p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href={`/create?template=${template.slug}&destination=${destination}&layout=${layout}&intent=reel`}>
              Make a video with this template <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen aria-hidden className="size-4 text-brand" /> Want it on paper?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn your photos and words into a photo book or travel magazine in this template&apos;s spirit, then download a print-ready PDF.
          </p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href={`/photo-books/start?template=${bookTemplateFor(template.slug)}`}>
              Create Photo Book <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </aside>

      <section aria-label="Template preview" className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Sample photos · {template.name}</p>
          <DeviceToggle value={device} onChange={setDevice} />
        </div>
        <DevicePreview device={device} label={`${template.name} preview`}>
          <MemoryRenderer memory={memory} sizesHint="preview" />
        </DevicePreview>
      </section>
    </div>
  );
}
