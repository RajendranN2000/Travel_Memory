import { describe, expect, it } from "vitest";
import { checkReadiness } from "@/features/editor/readiness";
import { frameStyle } from "@/features/templates/components/shared";
import { isOwnedStoragePath, parseFrame, photoLabelFromPath, photoPatchSchema, photoStoragePath } from "@/features/trips/schemas";

const OWNER = "11111111-1111-4111-8111-111111111111";
const TRIP = "22222222-2222-4222-8222-222222222222";
const PHOTO = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";

const photo = { id: "p", src: "/x.jpg", width: 800, height: 600, caption: "", location: "", takenOn: null };

describe("photo frames", () => {
  it("keeps the template shape unless one is chosen", () => {
    expect(frameStyle(photo)).toBeUndefined();
    expect(frameStyle({ ...photo, frame: { shape: "auto" } })).toBeUndefined();
    expect(frameStyle({ ...photo, frame: { shape: "square" } })).toEqual({ aspectRatio: "1 / 1" });
    expect(frameStyle({ ...photo, frame: { shape: "original" } })).toEqual({ aspectRatio: "800 / 600" });
  });

  it("validates frame values and drops bad stored data", () => {
    expect(photoPatchSchema.safeParse({ frame: { zoom: 1.5, x: 20, y: 80, shape: "portrait", fit: "contain" } }).success).toBe(true);
    expect(photoPatchSchema.safeParse({ frame: { zoom: 9 } }).success).toBe(false);
    expect(photoPatchSchema.safeParse({ frame: { shape: "huge" } }).success).toBe(false);
    expect(photoPatchSchema.safeParse({ frame: { evil: true } }).success).toBe(false);
    expect(parseFrame({ zoom: 2, x: 10 })).toEqual({ zoom: 2, x: 10 });
    expect(parseFrame({ zoom: 99 })).toEqual({});
    expect(parseFrame("nonsense")).toEqual({});
  });
});

describe("replacement file paths", () => {
  it("accepts any file inside the owner's trip folder, but nothing else", () => {
    const path = photoStoragePath(OWNER, TRIP, OTHER, "image/jpeg", "New shot.png");
    expect(path).toBe(`${OWNER}/${TRIP}/new-shot-${OTHER}.jpg`);
    expect(isOwnedStoragePath(path, OWNER, TRIP)).toBe(true);
    expect(isOwnedStoragePath(path, OTHER, TRIP)).toBe(false);
    expect(isOwnedStoragePath(path, OWNER, OTHER)).toBe(false);
    expect(isOwnedStoragePath(`${OWNER}/${TRIP}/../x.jpg`, OWNER, TRIP)).toBe(false);
  });

  it("recovers the readable name from a stored path", () => {
    expect(photoLabelFromPath(`${OWNER}/${TRIP}/eiffel-tower-${PHOTO}.jpg`)).toBe("eiffel-tower");
    expect(photoLabelFromPath(`${OWNER}/${TRIP}/${PHOTO}.jpg`)).toBe("");
  });
});

describe("readiness check", () => {
  const ready = {
    title: "Munnar",
    description: "A story",
    startDate: "2025-11-14",
    photos: [{ url: "https://x/y.jpg", caption: "Mist" }],
    uploadsBusy: false,
    unsaved: false,
    saveFailed: false,
  };

  it("passes when everything is filled in and loaded", () => {
    expect(checkReadiness(ready)).toEqual([]);
  });

  it("blocks on missing title, photos, uploads and failed saves", () => {
    const errors = checkReadiness({ ...ready, title: " ", photos: [], uploadsBusy: true, saveFailed: true }).filter((i) => i.severity === "error");
    expect(errors).toHaveLength(4);
  });

  it("warns about photos that can't be shown and missing details", () => {
    const warnings = checkReadiness({ ...ready, description: "", startDate: null, unsaved: true, photos: [{ url: null, caption: "" }] });
    expect(warnings.every((i) => i.severity === "warning")).toBe(true);
    const text = warnings.map((i) => i.message).join(" | ");
    for (const part of ["can't be displayed", "no caption", "story", "start date", "still saving"]) expect(text).toContain(part);
    expect(warnings).toHaveLength(5);
  });
});
