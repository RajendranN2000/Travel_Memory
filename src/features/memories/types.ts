import type { TemplateSlug } from "@/features/templates/types";

export const VISIBILITIES = ["public", "unlisted", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const FRAME_SHAPES = ["auto", "landscape", "square", "portrait", "original"] as const;
export type FrameShape = (typeof FRAME_SHAPES)[number];

/** How a photo is cropped and framed inside its template slot. All fields optional. */
export interface PhotoFrame {
  /** 1 = fit the slot, up to 3 = zoomed in */
  zoom?: number;
  /** Focus point as a percentage (0-100) from the left / top edge */
  x?: number;
  y?: number;
  /** Shape of the frame; "auto" keeps the template's own shape */
  shape?: FrameShape;
  /** "cover" fills the frame (crops); "contain" shows the whole photo */
  fit?: "cover" | "contain";
}

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
  frame?: PhotoFrame;
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
