import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeClient, createFakeState, type FakeState } from "../support/fake-supabase";

let state: FakeState;

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => createFakeClient(state) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));

const actions = await import("@/features/trips/actions");

const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TRIP = "11111111-1111-4111-8111-111111111111";
const BOB_TRIP = "22222222-2222-4222-8222-222222222222";
const P1 = "33333333-3333-4333-8333-333333333333";
const P2 = "44444444-4444-4444-8444-444444444444";

function trip(id: string, owner: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    owner_id: owner,
    title: "Monsoon week",
    description: "Rain and tea.",
    destination_slug: "munnar",
    template_slug: "field-journal",
    layout: "classic",
    palette: null,
    start_date: "2025-07-01",
    end_date: "2025-07-04",
    created_at: "2025-07-05T00:00:00Z",
    updated_at: "2025-07-05T00:00:00Z",
    ...extra,
  };
}

function photo(id: string, tripId: string, owner: string, position: number) {
  return {
    id,
    trip_id: tripId,
    owner_id: owner,
    storage_path: `${owner}/${tripId}/${id}.jpg`,
    mime_type: "image/jpeg",
    size_bytes: 1000,
    width: 1600,
    height: 1067,
    caption: `Caption ${position}`,
    location: "",
    taken_on: null,
    position,
  };
}

beforeEach(() => {
  state = createFakeState();
  state.userId = ALICE;
  state.tables.trips.push(trip(TRIP, ALICE), trip(BOB_TRIP, BOB));
  state.tables.trip_photos.push(photo(P1, TRIP, ALICE, 0), photo(P2, TRIP, ALICE, 1));
});

describe("authorisation", () => {
  it("rejects every mutation when signed out", async () => {
    state.userId = null;
    const results = await Promise.all([
      actions.updateTrip(TRIP, { title: "x" }),
      actions.publishTrip({ tripId: TRIP, visibility: "public" }),
      actions.deleteTrip(TRIP),
      actions.deletePhoto(P1),
      actions.reorderPhotos({ tripId: TRIP, photoIds: [P2, P1] }),
    ]);
    for (const r of results) expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/sign in/i) });
  });

  it("cannot read, edit, publish or delete another user's trip", async () => {
    expect(await actions.updateTrip(BOB_TRIP, { title: "Hacked" })).toMatchObject({ ok: false, error: "Trip not found." });
    expect(await actions.publishTrip({ tripId: BOB_TRIP, visibility: "public" })).toMatchObject({ ok: false, error: "Trip not found." });
    expect(await actions.deleteTrip(BOB_TRIP)).toMatchObject({ ok: false });
    expect(state.tables.trips.find((t) => t.id === BOB_TRIP)?.title).toBe("Monsoon week");
  });

  it("rejects malformed ids before querying", async () => {
    expect(await actions.updateTrip("../../etc", { title: "x" })).toMatchObject({ ok: false, error: "Trip not found." });
  });

  it("refuses photo registrations outside the user's folder", async () => {
    const result = await actions.registerPhoto({
      photoId: "55555555-5555-4555-8555-555555555555",
      tripId: TRIP,
      storagePath: `${BOB}/${TRIP}/55555555-5555-4555-8555-555555555555.jpg`,
      width: 10,
      height: 10,
    });
    expect(result.ok).toBe(false);
  });

  it("removes an uploaded object whose real type isn't allowed", async () => {
    const id = "66666666-6666-4666-8666-666666666666";
    const path = `${ALICE}/${TRIP}/${id}.jpg`;
    state.storage.set(path, { size: 2000, contentType: "text/html" });
    const result = await actions.registerPhoto({ photoId: id, tripId: TRIP, storagePath: path, width: 10, height: 10 });
    expect(result.ok).toBe(false);
    expect(state.removed).toContain(path);
    expect(state.tables.trip_photos.some((p) => p.id === id)).toBe(false);
  });

  it("registers a verified upload at the end of the list using the stored size", async () => {
    const id = "77777777-7777-4777-8777-777777777777";
    const path = `${ALICE}/${TRIP}/${id}.jpg`;
    state.storage.set(path, { size: 4321, contentType: "image/jpeg" });
    const result = await actions.registerPhoto({ photoId: id, tripId: TRIP, storagePath: path, width: 1200, height: 800 });
    expect(result).toMatchObject({ ok: true, data: { id, url: `https://signed.test/${path}` } });
    expect(state.tables.trip_photos.find((p) => p.id === id)).toMatchObject({ size_bytes: 4321, position: 2 });
  });
});

describe("trip editing", () => {
  it("validates date order against stored values", async () => {
    const result = await actions.updateTrip(TRIP, { endDate: "2025-06-01" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { endDate: expect.any(String) } });
  });

  it("resets the layout when the template changes", async () => {
    const result = await actions.updateTrip(TRIP, { templateSlug: "day-by-day" });
    expect(result.ok).toBe(true);
    expect(state.tables.trips.find((t) => t.id === TRIP)).toMatchObject({ template_slug: "day-by-day", layout: "vertical" });
  });

  it("rejects a reorder that doesn't match the trip's photos", async () => {
    const result = await actions.reorderPhotos({ tripId: TRIP, photoIds: [P1, "99999999-9999-4999-8999-999999999999"] });
    expect(result.ok).toBe(false);
  });

  it("saves a valid reorder", async () => {
    expect((await actions.reorderPhotos({ tripId: TRIP, photoIds: [P2, P1] })).ok).toBe(true);
    expect(state.tables.trip_photos.find((p) => p.id === P2)?.position).toBe(0);
  });
});

describe("publishing", () => {
  it("requires at least one photo", async () => {
    state.tables.trip_photos = [];
    expect(await actions.publishTrip({ tripId: TRIP, visibility: "public" })).toMatchObject({ ok: false, error: /photo/ });
  });

  it("requires a title", async () => {
    state.tables.trips[0].title = "  ";
    expect(await actions.publishTrip({ tripId: TRIP, visibility: "public" })).toMatchObject({ ok: false, error: /title/ });
  });

  it("publishes a snapshot with storage paths only, never URLs", async () => {
    const result = await actions.publishTrip({ tripId: TRIP, visibility: "unlisted", allowIndexing: true });
    expect(result.ok).toBe(true);
    const row = state.tables.published_memories[0];
    expect(row).toMatchObject({ owner_id: ALICE, trip_id: TRIP, visibility: "unlisted", allow_indexing: false });
    expect(row.slug).toMatch(/^monsoon-week-[a-z0-9]{10}$/);
    expect(row.photo_paths).toEqual([`${ALICE}/${TRIP}/${P1}.jpg`, `${ALICE}/${TRIP}/${P2}.jpg`]);
    expect(JSON.stringify(row.content)).not.toMatch(/https?:/);
  });

  it("keeps the same link when republishing", async () => {
    const first = await actions.publishTrip({ tripId: TRIP, visibility: "public" });
    state.tables.trips[0].title = "A new title";
    const second = await actions.publishTrip({ tripId: TRIP, visibility: "public", allowIndexing: true });
    expect(first.ok && second.ok && first.data.slug === second.data.slug).toBe(true);
    expect(state.tables.published_memories).toHaveLength(1);
    expect((state.tables.published_memories[0].content as { title: string }).title).toBe("A new title");
  });

  it("changes visibility without republishing content", async () => {
    await actions.publishTrip({ tripId: TRIP, visibility: "public", allowIndexing: true });
    const result = await actions.updateVisibility({ tripId: TRIP, visibility: "private", allowIndexing: true });
    expect(result).toMatchObject({ ok: true, data: { visibility: "private", allowIndexing: false } });
  });

  it("removes a deleted photo from the published snapshot and storage", async () => {
    await actions.publishTrip({ tripId: TRIP, visibility: "public" });
    const path = `${ALICE}/${TRIP}/${P1}.jpg`;
    expect((await actions.deletePhoto(P1)).ok).toBe(true);
    const pub = state.tables.published_memories[0];
    expect(pub.photo_paths).not.toContain(path);
    expect((pub.content as { photos: Array<{ path: string }> }).photos.map((p) => p.path)).not.toContain(path);
    expect(state.removed).toContain(path);
  });

  it("unpublishes", async () => {
    await actions.publishTrip({ tripId: TRIP, visibility: "public" });
    expect((await actions.unpublishTrip(TRIP)).ok).toBe(true);
    expect(state.tables.published_memories).toHaveLength(0);
  });
});
