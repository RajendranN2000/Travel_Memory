import { describe, expect, it } from "vitest";
import { checkFile, partitionFiles } from "@/features/editor/upload-validation";
import {
  createTripSchema,
  isOwnedPhotoPath,
  LIMITS,
  normaliseTripDesign,
  photoPatchSchema,
  photoStoragePath,
  publishSchema,
  tripPatchSchema,
} from "@/features/trips/schemas";
import { memorySlug, slugify } from "@/features/trips/slug";
import { safeNextPath } from "@/lib/safe-next";

const OWNER = "11111111-1111-4111-8111-111111111111";
const TRIP = "22222222-2222-4222-8222-222222222222";
const PHOTO = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";

describe("trip validation", () => {
  it("accepts a valid new trip and normalises empty dates to null", () => {
    const result = createTripSchema.safeParse({
      title: "  Monsoon in Munnar ",
      destinationSlug: "munnar",
      templateSlug: "field-journal",
      startDate: "",
      endDate: "",
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ title: "Monsoon in Munnar", startDate: null, endDate: null });
  });

  it("rejects unknown destinations and templates", () => {
    const result = createTripSchema.safeParse({ title: "x", destinationSlug: "atlantis", templateSlug: "brochure" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["destinationSlug", "templateSlug"]));
  });

  it("rejects an end date before the start date", () => {
    const result = createTripSchema.safeParse({
      title: "Trip",
      destinationSlug: "goa",
      templateSlug: "horizon-poster",
      startDate: "2025-12-31",
      endDate: "2025-12-01",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["endDate"]);
  });

  it("rejects over-long text and unknown fields in patches", () => {
    expect(tripPatchSchema.safeParse({ title: "a".repeat(LIMITS.title + 1) }).success).toBe(false);
    expect(tripPatchSchema.safeParse({ owner_id: OTHER }).success).toBe(false);
    expect(photoPatchSchema.safeParse({ caption: "b".repeat(LIMITS.caption + 1) }).success).toBe(false);
    expect(photoPatchSchema.safeParse({ storage_path: "x" }).success).toBe(false);
  });

  it("normalises layouts and palettes that don't belong to the template or destination", () => {
    const design = normaliseTripDesign({ destinationSlug: "goa", templateSlug: "day-by-day", layout: "mosaic", palette: "tea-estate" });
    expect(design.layout).toBe("vertical");
    expect(design.palette).toBeNull();
    const kept = normaliseTripDesign({ destinationSlug: "goa", templateSlug: "contact-sheet", layout: "scrapbook", palette: "arabian-sea" });
    expect(kept).toMatchObject({ layout: "scrapbook", palette: "arabian-sea" });
  });
});

describe("publishing rules", () => {
  it("only allows indexing for public memories", () => {
    expect(publishSchema.parse({ tripId: TRIP, visibility: "unlisted", allowIndexing: true }).allowIndexing).toBe(false);
    expect(publishSchema.parse({ tripId: TRIP, visibility: "private", allowIndexing: true }).allowIndexing).toBe(false);
    expect(publishSchema.parse({ tripId: TRIP, visibility: "public", allowIndexing: true }).allowIndexing).toBe(true);
  });

  it("rejects unknown visibility values", () => {
    expect(publishSchema.safeParse({ tripId: TRIP, visibility: "friends" }).success).toBe(false);
  });

  it("creates unguessable slugs that never collide with samples", () => {
    const a = memorySlug("Three days in Munnar!");
    const b = memorySlug("Three days in Munnar!");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^three-days-in-munnar-[a-z0-9]{10}$/);
    expect(memorySlug("Sample trip").startsWith("sample")).toBe(false);
    expect(memorySlug("!!!")).toMatch(/^trip-[a-z0-9]{10}$/);
    // Must satisfy the database CHECK constraint.
    for (const title of ["Café à Goa", "", "  ", "a".repeat(200)]) {
      const slug = memorySlug(title);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slug.length).toBeGreaterThanOrEqual(8);
      expect(slug.length).toBeLessThanOrEqual(90);
    }
  });

  it("slugifies accents and punctuation", () => {
    expect(slugify("Café à Goa — Day 1")).toBe("cafe-a-goa-day-1");
  });
});

describe("storage ownership", () => {
  it("builds owner-scoped paths", () => {
    expect(photoStoragePath(OWNER, TRIP, PHOTO, "image/jpeg")).toBe(`${OWNER}/${TRIP}/${PHOTO}.jpg`);
  });

  it("rejects paths outside the user's own folder or trip", () => {
    const own = photoStoragePath(OWNER, TRIP, PHOTO, "image/jpeg");
    expect(isOwnedPhotoPath(own, OWNER, TRIP, PHOTO)).toBe(true);
    expect(isOwnedPhotoPath(own, OTHER, TRIP, PHOTO)).toBe(false);
    expect(isOwnedPhotoPath(own, OWNER, OTHER, PHOTO)).toBe(false);
    expect(isOwnedPhotoPath(`${OWNER}/${TRIP}/../${OTHER}/${PHOTO}.jpg`, OWNER, TRIP, PHOTO)).toBe(false);
    expect(isOwnedPhotoPath(`${OWNER}/${TRIP}/${PHOTO}.svg`, OWNER, TRIP, PHOTO)).toBe(false);
  });
});

describe("upload validation", () => {
  const jpeg = (name = "a.jpg", size = 1024) => ({ name, type: "image/jpeg", size });

  it("accepts common photo formats", () => {
    expect(checkFile(jpeg()).ok).toBe(true);
    expect(checkFile({ name: "a.webp", type: "image/webp", size: 10 }).ok).toBe(true);
  });

  it("rejects unsupported, empty, oversized and HEIC files with helpful messages", () => {
    expect(checkFile({ name: "a.gif", type: "image/gif", size: 10 })).toMatchObject({ ok: false });
    expect(checkFile({ name: "a.svg", type: "image/svg+xml", size: 10 })).toMatchObject({ ok: false });
    expect(checkFile(jpeg("a.jpg", 0))).toMatchObject({ ok: false });
    expect(checkFile(jpeg("a.jpg", LIMITS.maxInputBytes + 1))).toMatchObject({ ok: false });
    const heic = checkFile({ name: "IMG_0001.HEIC", type: "", size: 10 });
    expect(heic.ok).toBe(false);
    if (!heic.ok) expect(heic.reason).toMatch(/HEIC/);
  });

  it("respects the per-trip photo limit", () => {
    const files = [jpeg("1.jpg"), jpeg("2.jpg"), jpeg("3.jpg")];
    const { accepted, rejected } = partitionFiles(files, LIMITS.photosPerTrip - 2);
    expect(accepted.map((f) => f.name)).toEqual(["1.jpg", "2.jpg"]);
    expect(rejected).toHaveLength(1);
  });
});

describe("safeNextPath", () => {
  it("allows same-site paths only", () => {
    expect(safeNextPath("/editor/abc?x=1")).toBe("/editor/abc?x=1");
    expect(safeNextPath("https://evil.example")).toBe("/my-memories");
    expect(safeNextPath("//evil.example")).toBe("/my-memories");
    expect(safeNextPath("/\\evil.example")).toBe("/my-memories");
    expect(safeNextPath(undefined)).toBe("/my-memories");
  });
});
