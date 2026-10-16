import { beforeEach, describe, expect, it } from "vitest";
import { listReelDrafts } from "@/features/reel/reel-library";
import { autosaveReelProject, clearReelProject, loadReelProject, saveReelProject } from "@/features/reel/storage";
import { buildProject } from "@/features/reel/defaults";
import type { ReelSource, ReelTripBrief } from "@/features/reel/types";

const sources: ReelSource[] = [1, 2].map((n) => ({
  id: `p${n}`, name: `p${n}`, url: "https://example.test/x.jpg", width: 4000, height: 3000, caption: "", location: "", local: false, focusX: 50, focusY: 50,
}));
const brief: ReelTripBrief = {
  tripId: "trip-1", title: "Goa", startDate: null, endDate: null, sources,
  theme: {
    destinationName: "Goa", tagline: "", signOff: "", paletteName: "", ink: "#111", primary: "#111", accent: "#111", paper: "#fff",
    headingFont: "dm-serif", bodyFont: "outfit", scriptFont: "caveat", headingWeight: 400, headingItalic: false, headingUppercase: false,
  },
};

describe("local reel storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists reels in progress with their length and style", () => {
    autosaveReelProject("trip-1", buildProject(brief, { presetKey: "adventure" }));
    const drafts = listReelDrafts();
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ tripId: "trip-1", clipCount: 2, presetKey: "adventure" });
    expect(drafts[0].durationMs).toBeGreaterThan(0);
  });

  it("ignores empty projects, unrelated keys and corrupt data", () => {
    autosaveReelProject("empty", buildProject({ ...brief, sources: [] }));
    window.localStorage.setItem("tms:reel:v1:bad", "{not json");
    window.localStorage.setItem("something-else", "1");
    expect(listReelDrafts()).toEqual([]);
  });

  it("restores the working copy, keeps the explicit save, and clears both", () => {
    const saved = buildProject(brief);
    saveReelProject("trip-1", saved);
    const edited = { ...saved, title: "Edited" };
    autosaveReelProject("trip-1", edited);
    const loaded = loadReelProject("trip-1");
    expect(loaded.project?.title).toBe("Edited");
    expect(loaded.saved?.title).toBe(saved.title);
    clearReelProject("trip-1");
    expect(loadReelProject("trip-1").project).toBeNull();
  });
});
