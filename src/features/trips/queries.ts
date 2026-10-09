import "server-only";
import type { Visibility } from "@/features/memories/types";
import { isTemplateSlug } from "@/features/templates/registry";
import type { ServerSupabase } from "@/lib/supabase/server";
import { uuidSchema } from "./schemas";
import type { EditorPhoto, EditorTrip, Publication, TripSummary } from "./types";

export const PHOTO_BUCKET = "trip-photos";
const SIGNED_URL_TTL = 60 * 60;

type PublicationRow = {
  slug: string;
  visibility: Visibility;
  allow_indexing: boolean;
  published_at: string;
  updated_at: string;
};

function toPublication(row: PublicationRow | null | undefined): Publication | null {
  if (!row) return null;
  return {
    slug: row.slug,
    visibility: row.visibility,
    allowIndexing: row.allow_indexing,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

/** Signs storage paths with the caller's own session (RLS limits it to their files). */
export async function signOwnPaths(supabase: ServerSupabase, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  if (error || !data) return out;
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) out.set(item.path, item.signedUrl);
  }
  return out;
}

/**
 * Loads a trip for the editor. Returns null when the id is malformed, the trip
 * does not exist or it belongs to someone else (RLS plus an explicit owner
 * filter, so both layers must agree).
 */
export async function getOwnedTrip(supabase: ServerSupabase, userId: string, tripId: string): Promise<EditorTrip | null> {
  if (!uuidSchema.safeParse(tripId).success) return null;

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the trip.");
  if (!trip) return null;

  const [{ data: photos, error: photoError }, { data: publication }] = await Promise.all([
    supabase
      .from("trip_photos")
      .select("id, storage_path, width, height, caption, location, taken_on, position")
      .eq("trip_id", tripId)
      .eq("owner_id", userId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("published_memories")
      .select("slug, visibility, allow_indexing, published_at, updated_at")
      .eq("trip_id", tripId)
      .eq("owner_id", userId)
      .maybeSingle(),
  ]);
  if (photoError) throw new Error("Could not load the trip photos.");

  const urls = await signOwnPaths(supabase, (photos ?? []).map((p) => p.storage_path));
  const editorPhotos: EditorPhoto[] = (photos ?? []).map((p) => ({
    id: p.id,
    storagePath: p.storage_path,
    url: urls.get(p.storage_path) ?? null,
    width: p.width,
    height: p.height,
    caption: p.caption,
    location: p.location,
    takenOn: p.taken_on,
  }));

  return {
    id: trip.id,
    title: trip.title,
    description: trip.description,
    destinationSlug: trip.destination_slug,
    templateSlug: isTemplateSlug(trip.template_slug) ? trip.template_slug : "field-journal",
    layout: trip.layout,
    palette: trip.palette,
    startDate: trip.start_date,
    endDate: trip.end_date,
    updatedAt: trip.updated_at,
    photos: editorPhotos,
    publication: toPublication(publication as PublicationRow | null),
  };
}

export async function listOwnedTrips(supabase: ServerSupabase, userId: string): Promise<TripSummary[]> {
  const { data: trips, error } = await supabase
    .from("trips")
    .select("id, title, destination_slug, template_slug, start_date, end_date, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not load your memories.");
  if (!trips || trips.length === 0) return [];

  const ids = trips.map((t) => t.id);
  const [{ data: photos }, { data: publications }] = await Promise.all([
    supabase
      .from("trip_photos")
      .select("trip_id, storage_path, width, height, position")
      .in("trip_id", ids)
      .eq("owner_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("published_memories")
      .select("trip_id, slug, visibility, allow_indexing, published_at, updated_at")
      .in("trip_id", ids)
      .eq("owner_id", userId),
  ]);

  const counts = new Map<string, number>();
  const covers = new Map<string, { path: string; width: number; height: number }>();
  for (const p of photos ?? []) {
    counts.set(p.trip_id, (counts.get(p.trip_id) ?? 0) + 1);
    if (!covers.has(p.trip_id)) covers.set(p.trip_id, { path: p.storage_path, width: p.width, height: p.height });
  }
  const urls = await signOwnPaths(supabase, [...covers.values()].map((c) => c.path));
  const pubs = new Map((publications ?? []).map((p) => [p.trip_id, p as PublicationRow & { trip_id: string }]));

  return trips.map((t) => {
    const cover = covers.get(t.id);
    const publication = toPublication(pubs.get(t.id));
    return {
      id: t.id,
      title: t.title,
      destinationSlug: t.destination_slug,
      templateSlug: t.template_slug,
      startDate: t.start_date,
      endDate: t.end_date,
      updatedAt: t.updated_at,
      photoCount: counts.get(t.id) ?? 0,
      coverUrl: cover ? (urls.get(cover.path) ?? null) : null,
      coverSize: cover ? { width: cover.width, height: cover.height } : null,
      publication,
      hasUnpublishedChanges: publication ? new Date(t.updated_at) > new Date(publication.updatedAt) : false,
    };
  });
}
