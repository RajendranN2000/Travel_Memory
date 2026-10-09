export const TEMPLATE_SLUGS = ["horizon-poster", "field-journal", "contact-sheet", "day-by-day"] as const;
export type TemplateSlug = (typeof TEMPLATE_SLUGS)[number];

export type TemplateFamily = "poster" | "journal" | "collage" | "timeline";

export interface TemplateLayout {
  key: string;
  name: string;
  description: string;
}

export interface TemplateDefinition {
  slug: TemplateSlug;
  family: TemplateFamily;
  name: string;
  summary: string;
  bestFor: string;
  /** Recommended photo count range */
  photoRange: [number, number];
  /** First layout is the default */
  layouts: [TemplateLayout, ...TemplateLayout[]];
}
