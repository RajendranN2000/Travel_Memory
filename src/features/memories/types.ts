import type { TemplateSlug } from "@/features/templates/types";

export const VISIBILITIES = ["public", "unlisted", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export interface MemoryPhoto {
  id: string;
  /** A displayable URL, or null when the image cannot be shown */
  src: string | null;
  width: number;
  height: number;
  caption: string;
  location: string;
  /** ISO date (YYYY-MM-DD) entered by the user, used by the timeline */
  takenOn: string | null;
}

/** Everything a template needs to render a memory. */
export interface MemoryContent {
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  destinationSlug: string;
  templateSlug: TemplateSlug;
  layout: string;
  palette: string | null;
  photos: MemoryPhoto[];
}
