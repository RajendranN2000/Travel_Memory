import type { TemplateDefinition, TemplateSlug } from "./types";
import { TEMPLATE_SLUGS } from "./types";

export const templates: TemplateDefinition[] = [
  {
    slug: "horizon-poster",
    family: "poster",
    name: "Horizon Poster",
    summary: "One unforgettable cover photo, a bold title and a tidy gallery underneath. Inspired by vintage travel posters.",
    bestFor: "Trips with one hero shot you love",
    photoRange: [1, 12],
    layouts: [
      { key: "full-bleed", name: "Full bleed", description: "The cover photo fills the screen with the title laid over it." },
      { key: "framed", name: "Framed", description: "A poster with a paper border, big type and the photo set inside." },
    ],
  },
  {
    slug: "field-journal",
    family: "journal",
    name: "Field Journal",
    summary: "An editorial photo essay with generous type, pull quotes and photos that alternate in rhythm.",
    bestFor: "Trips with stories to tell",
    photoRange: [3, 20],
    layouts: [
      { key: "classic", name: "Classic", description: "A magazine-style column with photos set in pairs and singles." },
      { key: "wide", name: "Wide", description: "Edge-to-edge photographs with text panels between them." },
    ],
  },
  {
    slug: "contact-sheet",
    family: "collage",
    name: "Contact Sheet",
    summary: "A dense, carefully composed collage of every moment, from wide landscapes to small details.",
    bestFor: "Lots of photos and little text",
    photoRange: [4, 30],
    layouts: [
      { key: "mosaic", name: "Mosaic", description: "A tight grid of varied tile sizes." },
      { key: "scrapbook", name: "Scrapbook", description: "Printed photos, tape and handwritten captions." },
    ],
  },
  {
    slug: "day-by-day",
    family: "timeline",
    name: "Day by Day",
    summary: "A timeline that walks through the trip in order, grouped by the dates you set on each photo.",
    bestFor: "Road trips, treks and multi-stop journeys",
    photoRange: [3, 30],
    layouts: [
      { key: "vertical", name: "Vertical", description: "A single trail running down the page." },
      { key: "alternating", name: "Alternating", description: "Moments alternate either side of the trail on wider screens." },
    ],
  },
];

const bySlug = new Map(templates.map((t) => [t.slug, t]));

export function isTemplateSlug(value: unknown): value is TemplateSlug {
  return typeof value === "string" && (TEMPLATE_SLUGS as readonly string[]).includes(value);
}

export function getTemplate(slug: string | null | undefined): TemplateDefinition | null {
  if (!slug || !isTemplateSlug(slug)) return null;
  return bySlug.get(slug) ?? null;
}

/** Returns a valid layout key for a template, falling back to its default. */
export function resolveLayout(template: TemplateDefinition, layout: string | null | undefined): string {
  return template.layouts.some((l) => l.key === layout) ? (layout as string) : template.layouts[0].key;
}
