"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/features/auth/schemas";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { PHOTO_BUCKET, signOwnPaths } from "./queries";
import {
  createTripSchema,
  isOwnedPhotoPath,
  LIMITS,
  normaliseTripDesign,
  photoPatchSchema,
  publishSchema,
  registerPhotoSchema,
  reorderSchema,
  STORED_TYPES,
  tripPatchSchema,
  uuidSchema,
  type PhotoPatch,
  type TripPatch,
} from "./schemas";
import { memorySlug } from "./slug";
import type { ActionResult, EditorPhoto, Publication, PublishedContent } from "./types";

type Authed = { supabase: ServerSupabase; userId: string };

async function authed(): Promise<Authed | { error: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Saving is unavailable because Supabase isn't configured." };
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: "Your session has expired. Please sign in again." };
  return { supabase, userId };
}

function fail<T = undefined>(error: string, fieldErrors?: Record<string, string>): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

function dbMessage(error: { message?: string; code?: string } | null, fallback: string): string {
  const msg = error?.message ?? "";
  if (msg.includes("trip_limit_reached")) return "You've reached the limit of 100 trips. Delete an old trip to make room.";
  if (msg.includes("photo_limit_reached")) return `A trip can hold up to ${LIMITS.photosPerTrip} photos.`;
  return fallback;
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export async function createTrip(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    destinationSlug: String(formData.get("destinationSlug") ?? ""),
    templateSlug: String(formData.get("templateSlug") ?? ""),
    layout: String(formData.get("layout") ?? "") || undefined,
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
  };
  const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v ?? ""])) as Record<string, string>;
  const parsed = createTripSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const auth = await authed();
  if ("error" in auth) return { status: "error", message: auth.error, values };

  const design = normaliseTripDesign({ ...parsed.data, palette: null });
  const { data, error } = await auth.supabase
    .from("trips")
    .insert({
      owner_id: auth.userId,
      title: design.title,
      description: design.description,
      destination_slug: design.destinationSlug,
      template_slug: design.templateSlug,
      layout: design.layout,
      palette: null,
      start_date: design.startDate ?? null,
      end_date: design.endDate ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { status: "error", message: dbMessage(error, "We couldn't create the trip. Please try again."), values };
  }
  redirect(`/editor/${data.id}`);
}

export async function updateTrip(tripId: string, patch: TripPatch): Promise<ActionResult<{ updatedAt: string }>> {
  if (!uuidSchema.safeParse(tripId).success) return fail("Trip not found.");
  const parsed = tripPatchSchema.safeParse(patch);
  if (!parsed.success) return fail("Some changes couldn't be saved.", fieldErrorsFrom(parsed.error) as Record<string, string>);
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);

  const { data: current, error: loadError } = await auth.supabase
    .from("trips")
    .select("destination_slug, template_slug, layout, palette, start_date, end_date")
    .eq("id", tripId)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (loadError) return fail("We couldn't save your changes. Please try again.");
  if (!current) return fail("Trip not found.");

  const p = parsed.data;
  const start = p.startDate !== undefined ? p.startDate : current.start_date;
  const end = p.endDate !== undefined ? p.endDate : current.end_date;
  if (start && end && end < start) return fail("The end date can't be before the start date.", { endDate: "The end date can't be before the start date." });

  const design = normaliseTripDesign({
    destinationSlug: p.destinationSlug ?? current.destination_slug,
    templateSlug: p.templateSlug ?? current.template_slug,
    layout: p.layout ?? current.layout,
    palette: p.palette !== undefined ? p.palette : current.palette,
  });

  const { data, error } = await auth.supabase
    .from("trips")
    .update({
      ...(p.title !== undefined && { title: p.title }),
      ...(p.description !== undefined && { description: p.description }),
      destination_slug: design.destinationSlug,
      template_slug: design.templateSlug,
      layout: design.layout,
      palette: design.palette,
      start_date: start ?? null,
      end_date: end ?? null,
    })
    .eq("id", tripId)
    .eq("owner_id", auth.userId)
    .select("updated_at")
    .single();
  if (error || !data) return fail("We couldn't save your changes. Please try again.");
  return { ok: true, data: { updatedAt: data.updated_at } };
}

export async function deleteTrip(tripId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(tripId).success) return fail("Trip not found.");
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);

  const { data: photos } = await auth.supabase
    .from("trip_photos")
    .select("storage_path")
    .eq("trip_id", tripId)
    .eq("owner_id", auth.userId);

  const { error, count } = await auth.supabase
    .from("trips")
    .delete({ count: "exact" })
    .eq("id", tripId)
    .eq("owner_id", auth.userId);
  if (error) return fail("We couldn't delete this trip. Please try again.");
  if (!count) return fail("Trip not found.");

  const paths = (photos ?? []).map((p) => p.storage_path);
  if (paths.length > 0) await auth.supabase.storage.from(PHOTO_BUCKET).remove(paths);
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/**
 * Records a photo after the browser has uploaded it to the user's storage
 * folder. Verifies the path, the stored object's real size and type, and the
 * per-trip limit. Removes the object if anything is wrong.
 */
export async function registerPhoto(input: z.input<typeof registerPhotoSchema>): Promise<ActionResult<EditorPhoto>> {
  const parsed = registerPhotoSchema.safeParse(input);
  if (!parsed.success) return fail("That upload wasn't valid.");
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);
  const { photoId, tripId, storagePath, width, height } = parsed.data;
  const bucket = auth.supabase.storage.from(PHOTO_BUCKET);

  if (!isOwnedPhotoPath(storagePath, auth.userId, tripId, photoId)) return fail("That upload wasn't valid.");

  const cleanup = async (message: string) => {
    await bucket.remove([storagePath]);
    return fail<EditorPhoto>(message);
  };

  const { data: info, error: infoError } = await bucket.info(storagePath);
  if (infoError || !info) return fail("We couldn't find the uploaded file. Please try again.");
  const size = info.size ?? (info.metadata as { size?: number } | undefined)?.size ?? 0;
  const mime = info.contentType ?? (info.metadata as { mimetype?: string } | undefined)?.mimetype ?? "";
  if (!(STORED_TYPES as readonly string[]).includes(mime)) return cleanup("Only JPEG, PNG and WebP images are supported.");
  if (size <= 0 || size > LIMITS.maxUploadBytes) return cleanup("That photo is larger than 10 MB after compression.");

  const { count } = await auth.supabase
    .from("trip_photos")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .eq("owner_id", auth.userId);
  if ((count ?? 0) >= LIMITS.photosPerTrip) return cleanup(`A trip can hold up to ${LIMITS.photosPerTrip} photos.`);

  const { data: last } = await auth.supabase
    .from("trip_photos")
    .select("position")
    .eq("trip_id", tripId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: row, error } = await auth.supabase
    .from("trip_photos")
    .insert({
      id: photoId,
      trip_id: tripId,
      owner_id: auth.userId,
      storage_path: storagePath,
      mime_type: mime,
      size_bytes: size,
      width,
      height,
      position: (last?.position ?? -1) + 1,
    })
    .select("id, storage_path, width, height, caption, location, taken_on")
    .single();
  if (error || !row) return cleanup(dbMessage(error, "We couldn't save that photo. Please try again."));

  const urls = await signOwnPaths(auth.supabase, [row.storage_path]);
  return {
    ok: true,
    data: {
      id: row.id,
      storagePath: row.storage_path,
      url: urls.get(row.storage_path) ?? null,
      width: row.width,
      height: row.height,
      caption: row.caption,
      location: row.location,
      takenOn: row.taken_on,
    },
  };
}

export async function updatePhoto(photoId: string, patch: PhotoPatch): Promise<ActionResult<{ updatedAt: string }>> {
  if (!uuidSchema.safeParse(photoId).success) return fail("Photo not found.");
  const parsed = photoPatchSchema.safeParse(patch);
  if (!parsed.success) return fail("Some changes couldn't be saved.", fieldErrorsFrom(parsed.error) as Record<string, string>);
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);

  const p = parsed.data;
  const { data, error } = await auth.supabase
    .from("trip_photos")
    .update({
      ...(p.caption !== undefined && { caption: p.caption }),
      ...(p.location !== undefined && { location: p.location }),
      ...(p.takenOn !== undefined && { taken_on: p.takenOn }),
    })
    .eq("id", photoId)
    .eq("owner_id", auth.userId)
    .select("updated_at")
    .maybeSingle();
  if (error) return fail("We couldn't save that caption. Please try again.");
  if (!data) return fail("Photo not found.");
  return { ok: true, data: { updatedAt: data.updated_at } };
}

/**
 * Deletes a photo everywhere: the database row, the stored file and any
 * published snapshot that still references it.
 */
export async function deletePhoto(photoId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(photoId).success) return fail("Photo not found.");
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);

  const { data: photo } = await auth.supabase
    .from("trip_photos")
    .select("id, trip_id, storage_path")
    .eq("id", photoId)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (!photo) return fail("Photo not found.");

  const { error } = await auth.supabase.from("trip_photos").delete().eq("id", photoId).eq("owner_id", auth.userId);
  if (error) return fail("We couldn't remove that photo. Please try again.");

  const { data: pub } = await auth.supabase
    .from("published_memories")
    .select("id, content, photo_paths")
    .eq("trip_id", photo.trip_id)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (pub && pub.photo_paths.includes(photo.storage_path)) {
    const content = pub.content as unknown as PublishedContent;
    await auth.supabase
      .from("published_memories")
      .update({
        content: { ...content, photos: content.photos.filter((p) => p.path !== photo.storage_path) } as unknown as Json,
        photo_paths: pub.photo_paths.filter((p) => p !== photo.storage_path),
      })
      .eq("id", pub.id)
      .eq("owner_id", auth.userId);
  }

  await auth.supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  return { ok: true, data: undefined };
}

export async function reorderPhotos(input: z.input<typeof reorderSchema>): Promise<ActionResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return fail("That order wasn't valid.");
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);
  const { tripId, photoIds } = parsed.data;

  const { data: existing, error } = await auth.supabase
    .from("trip_photos")
    .select("id")
    .eq("trip_id", tripId)
    .eq("owner_id", auth.userId);
  if (error) return fail("We couldn't save the new order. Please try again.");
  const known = new Set((existing ?? []).map((p) => p.id));
  if (known.size !== photoIds.length || !photoIds.every((id) => known.has(id))) {
    return fail("Your photos changed in another tab. Reload to see the latest version.");
  }

  const results = await Promise.all(
    photoIds.map((id, position) =>
      auth.supabase.from("trip_photos").update({ position }).eq("id", id).eq("owner_id", auth.userId),
    ),
  );
  if (results.some((r) => r.error)) return fail("We couldn't save the new order. Please try again.");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export async function publishTrip(input: z.input<typeof publishSchema>): Promise<ActionResult<Publication>> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return fail("Choose who can see this memory.");
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);
  const { tripId, visibility, allowIndexing } = parsed.data;

  const { data: trip } = await auth.supabase.from("trips").select("*").eq("id", tripId).eq("owner_id", auth.userId).maybeSingle();
  if (!trip) return fail("Trip not found.");
  if (!trip.title.trim()) return fail("Add a title before publishing.");

  const { data: photos, error: photoError } = await auth.supabase
    .from("trip_photos")
    .select("id, storage_path, width, height, caption, location, taken_on")
    .eq("trip_id", tripId)
    .eq("owner_id", auth.userId)
    .order("position", { ascending: true });
  if (photoError) return fail("We couldn't publish right now. Please try again.");
  if (!photos || photos.length === 0) return fail("Add at least one photo before publishing.");

  const design = normaliseTripDesign({
    destinationSlug: trip.destination_slug,
    templateSlug: trip.template_slug,
    layout: trip.layout,
    palette: trip.palette,
  });
  const content: PublishedContent = {
    version: 1,
    title: trip.title,
    description: trip.description,
    startDate: trip.start_date,
    endDate: trip.end_date,
    destinationSlug: design.destinationSlug,
    templateSlug: design.templateSlug as PublishedContent["templateSlug"],
    layout: design.layout,
    palette: design.palette,
    photos: photos.map((p) => ({
      id: p.id,
      path: p.storage_path,
      width: p.width,
      height: p.height,
      caption: p.caption,
      location: p.location,
      takenOn: p.taken_on,
    })),
  };

  const { data: existing } = await auth.supabase
    .from("published_memories")
    .select("id, slug")
    .eq("trip_id", tripId)
    .eq("owner_id", auth.userId)
    .maybeSingle();

  const payload = {
    visibility,
    allow_indexing: allowIndexing,
    content: content as unknown as Json,
    photo_paths: content.photos.map((p) => p.path),
  };

  const query = existing
    ? auth.supabase.from("published_memories").update(payload).eq("id", existing.id).eq("owner_id", auth.userId)
    : auth.supabase.from("published_memories").insert({ ...payload, trip_id: tripId, owner_id: auth.userId, slug: memorySlug(trip.title) });

  const { data, error } = await query.select("slug, visibility, allow_indexing, published_at, updated_at").single();
  if (error || !data) return fail("We couldn't publish right now. Please try again.");
  return {
    ok: true,
    data: {
      slug: data.slug,
      visibility: data.visibility,
      allowIndexing: data.allow_indexing,
      publishedAt: data.published_at,
      updatedAt: data.updated_at,
    },
  };
}

/** Changes who can see a published memory without republishing its content. */
export async function updateVisibility(input: z.input<typeof publishSchema>): Promise<ActionResult<Publication>> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return fail("Choose who can see this memory.");
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);
  const { data, error } = await auth.supabase
    .from("published_memories")
    .update({ visibility: parsed.data.visibility, allow_indexing: parsed.data.allowIndexing })
    .eq("trip_id", parsed.data.tripId)
    .eq("owner_id", auth.userId)
    .select("slug, visibility, allow_indexing, published_at, updated_at")
    .maybeSingle();
  if (error) return fail("We couldn't update the sharing setting. Please try again.");
  if (!data) return fail("This memory isn't published yet.");
  return {
    ok: true,
    data: {
      slug: data.slug,
      visibility: data.visibility,
      allowIndexing: data.allow_indexing,
      publishedAt: data.published_at,
      updatedAt: data.updated_at,
    },
  };
}

export async function unpublishTrip(tripId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(tripId).success) return fail("Trip not found.");
  const auth = await authed();
  if ("error" in auth) return fail(auth.error);
  const { error } = await auth.supabase.from("published_memories").delete().eq("trip_id", tripId).eq("owner_id", auth.userId);
  if (error) return fail("We couldn't unpublish this memory. Please try again.");
  return { ok: true, data: undefined };
}
