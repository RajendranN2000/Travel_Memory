import "server-only";
import { cache } from "react";
import { z } from "zod";
import { isTemplateSlug } from "@/features/templates/registry";
import { PHOTO_BUCKET, signOwnPaths } from "@/features/trips/queries";
import { photoFrameSchema } from "@/features/trips/schemas";
import type { PublishedContent } from "@/features/trips/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSampleMemory, isReservedSlug } from "./samples";
import type { MemoryContent, Visibility } from "./types";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PUBLIC_URL_TTL = 60 * 60;

const contentSchema = z.object({
  version: z.literal(1),
  title: z.string().max(200),
  description: z.string().max(4000),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  destinationSlug: z.string().max(40),
  templateSlug: z.string().refine(isTemplateSlug),
  layout: z.string().max(40),
  palette: z.string().max(40).nullable(),
  photos: z
    .array(
      z.object({
        id: z.string(),
        path: z.string(),
        width: z.number(),
        height: z.number(),
        caption: z.string(),
        location: z.string(),
        takenOn: z.string().nullable(),
        frame: photoFrameSchema.optional(),
      }),
    )
    .max(100),
});

export interface LoadedMemory {
  slug: string;
  content: MemoryContent;
  visibility: Visibility;
  allowIndexing: boolean;
  isOwner: boolean;
  isSample: boolean;
  publishedAt: string | null;
  /** True when photo URLs couldn't be generated (server key missing) */
  photosUnavailable: boolean;
}

function toMemoryContent(content: PublishedContent, urls: Map<string, string>): MemoryContent {
  return {
    title: content.title,
    description: content.description,
    startDate: content.startDate,
    endDate: content.endDate,
    destinationSlug: content.destinationSlug,
    templateSlug: content.templateSlug,
    layout: content.layout,
    palette: content.palette,
    photos: content.photos.map((p) => ({
      id: p.id,
      src: urls.get(p.path) ?? null,
      width: p.width,
      height: p.height,
      caption: p.caption,
      location: p.location,
      takenOn: p.takenOn,
      frame: p.frame,
    })),
  };
}

/**
 * Loads a published memory if the current visitor is allowed to see it.
 * Returns null for unknown slugs *and* for private memories the visitor
 * doesn't own, so the existence of a private memory is never revealed.
 */
export const loadPublishedMemory = cache(async (slug: string): Promise<LoadedMemory | null> => {
  if (!SLUG_RE.test(slug) || slug.length > 90) return null;

  if (isReservedSlug(slug)) {
    const sample = getSampleMemory(slug);
    if (!sample) return null;
    return {
      slug,
      content: sample.content,
      visibility: "public",
      allowIndexing: false,
      isOwner: false,
      isSample: true,
      publishedAt: null,
      photosUnavailable: false,
    };
  }

  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_published_memory", { p_slug: slug });
  if (error) throw new Error("Could not load this memory.");
  const row = data?.[0];
  if (!row) return null;

  const parsed = contentSchema.safeParse(row.content);
  if (!parsed.success) throw new Error("This memory's content is invalid.");
  const content = parsed.data as PublishedContent;
  // Only sign paths that the publication itself lists.
  const allowed = new Set(row.photo_paths);
  const paths = content.photos.map((p) => p.path).filter((p) => allowed.has(p));

  let urls = new Map<string, string>();
  let photosUnavailable = false;
  if (paths.length > 0) {
    if (row.is_owner) {
      urls = await signOwnPaths(supabase, paths);
    } else {
      const admin = createAdminClient();
      if (admin) {
        const { data: signed } = await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths, PUBLIC_URL_TTL);
        for (const s of signed ?? []) if (s.path && s.signedUrl && !s.error) urls.set(s.path, s.signedUrl);
      }
    }
    photosUnavailable = urls.size === 0;
  }

  return {
    slug: row.slug,
    content: toMemoryContent(content, urls),
    visibility: row.visibility,
    allowIndexing: row.allow_indexing,
    isOwner: row.is_owner,
    isSample: false,
    publishedAt: row.published_at,
    photosUnavailable,
  };
});
