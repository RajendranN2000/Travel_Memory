import type { PhotoFrame, Visibility } from "@/features/memories/types";
import type { TemplateSlug } from "@/features/templates/types";

export interface EditorPhoto {
  id: string;
  storagePath: string;
  /** Short-lived signed URL, or null if signing failed */
  url: string | null;
  width: number;
  height: number;
  caption: string;
  location: string;
  takenOn: string | null;
  frame: PhotoFrame;
}

export interface Publication {
  slug: string;
  visibility: Visibility;
  allowIndexing: boolean;
  publishedAt: string;
  updatedAt: string;
}

export interface EditorTrip {
  id: string;
  title: string;
  description: string;
  destinationSlug: string;
  templateSlug: TemplateSlug;
  layout: string;
  palette: string | null;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
  photos: EditorPhoto[];
  publication: Publication | null;
}

export interface TripSummary {
  id: string;
  title: string;
  destinationSlug: string;
  templateSlug: string;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
  photoCount: number;
  coverUrl: string | null;
  coverSize: { width: number; height: number } | null;
  publication: Publication | null;
  /** Draft has edits made after the last publish */
  hasUnpublishedChanges: boolean;
}

/** Photo entry stored in a published snapshot (no URLs, only storage paths). */
export interface PublishedPhoto {
  id: string;
  path: string;
  width: number;
  height: number;
  caption: string;
  location: string;
  takenOn: string | null;
  frame?: PhotoFrame;
}

export interface PublishedContent {
  version: 1;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  destinationSlug: string;
  templateSlug: TemplateSlug;
  layout: string;
  palette: string | null;
  photos: PublishedPhoto[];
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };
