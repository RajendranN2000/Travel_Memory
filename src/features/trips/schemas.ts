import { z } from "zod";
import { FRAME_SHAPES, VISIBILITIES, type PhotoFrame } from "@/features/memories/types";
import { getTemplate, isTemplateSlug } from "@/features/templates/registry";
import { getDestinationTheme, isKnownDestination } from "@/features/themes/registry";
import { parseIsoDate } from "@/lib/dates";

export const LIMITS = {
  title: 120,
  description: 2000,
  caption: 280,
  location: 120,
  photosPerTrip: 60,
  maxUploadBytes: 10 * 1024 * 1024,
  maxInputBytes: 30 * 1024 * 1024,
  maxDimension: 2400,
} as const;

export const ACCEPTED_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const STORED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const uuidSchema = z.string().uuid("Invalid identifier.");

const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || parseIsoDate(v) !== null, "Enter a valid date.")
  .transform((v) => (v === "" ? null : v));

const optionalIsoDate = z.union([isoDate, z.null()]).optional();

export const destinationSlugSchema = z.string().refine(isKnownDestination, "Choose a destination.");
export const templateSlugSchema = z.string().refine(isTemplateSlug, "Choose a template.");

/** Fields a user can edit on a trip. All optional for partial updates. */
export const tripPatchSchema = z
  .object({
    title: z.string().trim().max(LIMITS.title, `Keep the title under ${LIMITS.title} characters.`),
    description: z.string().trim().max(LIMITS.description, `Keep the story under ${LIMITS.description} characters.`),
    destinationSlug: destinationSlugSchema,
    templateSlug: templateSlugSchema,
    layout: z.string().max(40),
    palette: z.string().max(40).nullable(),
    startDate: optionalIsoDate,
    endDate: optionalIsoDate,
  })
  .partial()
  .strict();

export type TripPatch = z.infer<typeof tripPatchSchema>;

export const createTripSchema = z
  .object({
    title: z.string().trim().min(1, "Give your trip a title.").max(LIMITS.title, `Keep the title under ${LIMITS.title} characters.`),
    description: z.string().trim().max(LIMITS.description).default(""),
    destinationSlug: destinationSlugSchema,
    templateSlug: templateSlugSchema,
    layout: z.string().max(40).optional(),
    startDate: optionalIsoDate,
    endDate: optionalIsoDate,
  })
  .superRefine((v, ctx) => checkDateOrder(v.startDate, v.endDate, ctx));

export function checkDateOrder(start: string | null | undefined, end: string | null | undefined, ctx: z.RefinementCtx) {
  if (start && end && end < start) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "The end date can't be before the start date." });
  }
}

/**
 * Brings template-dependent fields into a consistent state: an unknown layout
 * becomes the template default and an unknown palette becomes null (default).
 */
export function normaliseTripDesign<T extends { destinationSlug: string; templateSlug: string; layout?: string | null; palette?: string | null }>(
  trip: T,
): T & { layout: string; palette: string | null } {
  const template = getTemplate(trip.templateSlug);
  const theme = getDestinationTheme(trip.destinationSlug);
  const layout = template?.layouts.some((l) => l.key === trip.layout) ? (trip.layout as string) : (template?.layouts[0].key ?? "");
  const palette = theme?.palettes.some((p) => p.key === trip.palette) ? (trip.palette as string) : null;
  return { ...trip, layout, palette };
}

export const photoFrameSchema = z
  .object({
    zoom: z.number().min(1).max(3),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    shape: z.enum(FRAME_SHAPES),
    fit: z.enum(["cover", "contain"]),
  })
  .partial()
  .strict();

/** Reads a stored frame defensively: drops anything invalid rather than failing. */
export function parseFrame(value: unknown): PhotoFrame {
  const parsed = photoFrameSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export const photoPatchSchema = z
  .object({
    frame: photoFrameSchema,
    caption: z.string().trim().max(LIMITS.caption, `Keep captions under ${LIMITS.caption} characters.`),
    location: z.string().trim().max(LIMITS.location, `Keep places under ${LIMITS.location} characters.`),
    takenOn: optionalIsoDate,
  })
  .partial()
  .strict();

export type PhotoPatch = z.infer<typeof photoPatchSchema>;

export const registerPhotoSchema = z.object({
  photoId: uuidSchema,
  tripId: uuidSchema,
  storagePath: z.string().max(200),
  width: z.number().int().min(1).max(12000),
  height: z.number().int().min(1).max(12000),
});

export const replacePhotoSchema = z.object({
  photoId: uuidSchema,
  storagePath: z.string().max(200),
  width: z.number().int().min(1).max(12000),
  height: z.number().int().min(1).max(12000),
});

export const duplicateTripSchema = z.object({
  tripId: uuidSchema,
  templateSlug: templateSlugSchema,
  title: z.string().trim().min(1, "Give the copy a title.").max(LIMITS.title, `Keep the title under ${LIMITS.title} characters.`),
});

export const reorderSchema = z.object({
  tripId: uuidSchema,
  photoIds: z.array(uuidSchema).max(LIMITS.photosPerTrip),
});

export const publishSchema = z
  .object({
    tripId: uuidSchema,
    visibility: z.enum(VISIBILITIES),
    allowIndexing: z.boolean().default(false),
  })
  .transform((v) => ({ ...v, allowIndexing: v.visibility === "public" ? v.allowIndexing : false }));

/** Expected storage location for a photo: <owner>/<trip>/<photo>.<ext> */
export function photoStoragePath(ownerId: string, tripId: string, photoId: string, mime: string, label?: string): string {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  // A readable prefix (from the original file name) makes objects easy to spot in
  // the Supabase dashboard. The photo id stays in the name so it is still unique.
  const slug = (label ?? "")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return `${ownerId}/${tripId}/${slug ? `${slug}-` : ""}${photoId}.${ext}`;
}

const UUID_PART = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(`^(${UUID_PART})/(${UUID_PART})/(?:[a-z0-9-]{1,40}-)?(${UUID_PART})\\.(jpg|png|webp)$`);

/** True when a storage path sits inside the given owner's and trip's folders. */
export function isOwnedStoragePath(path: string, ownerId: string, tripId: string): boolean {
  const match = PATH_RE.exec(path);
  return Boolean(match && match[1] === ownerId && match[2] === tripId);
}

/** The readable name prefix of a stored photo, e.g. "eiffel-tower" (or ""). */
export function photoLabelFromPath(path: string): string {
  const name = path.split("/").pop() ?? "";
  return name.replace(new RegExp(`-?${UUID_PART}\\.(jpg|png|webp)$`), "");
}

/** True when a storage path belongs to the given owner, trip and photo. */
export function isOwnedPhotoPath(path: string, ownerId: string, tripId: string, photoId: string): boolean {
  const match = PATH_RE.exec(path);
  return Boolean(match && match[1] === ownerId && match[2] === tripId && match[3] === photoId);
}
