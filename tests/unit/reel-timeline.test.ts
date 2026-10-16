import { describe, expect, it } from "vitest";
import { buildProject, reconcileProject } from "@/features/reel/defaults";
import { commit, createHistory, redo, undo } from "@/features/reel/history";
import {
  beatGrid,
  dropOverlaysOfClip,
  duplicateClip,
  effectiveTransition,
  layoutClips,
  placeOverlay,
  removeClip,
  reorderClips,
  resolveOverlays,
  setClipDuration,
  slotsAt,
  snapClipsToBeat,
  totalDuration,
} from "@/features/reel/timeline";
import type { Clip, ReelSource, ReelTripBrief } from "@/features/reel/types";

function clip(id: string, durationMs: number, transitionMs = 0, kind: Clip["transition"]["kind"] = "dissolve"): Clip {
  return { id, sourceId: `s_${id}`, durationMs, motion: "zoom-in", transition: { kind, durationMs: transitionMs }, fit: "cover", focusX: 50, focusY: 50 };
}

describe("clip layout and duration", () => {
  it("lays clips end to end when there are no transitions", () => {
    const slots = layoutClips([clip("a", 3000), clip("b", 2000)]);
    expect(slots.map((s) => [s.startMs, s.endMs])).toEqual([
      [0, 3000],
      [3000, 5000],
    ]);
    expect(totalDuration([clip("a", 3000), clip("b", 2000)])).toBe(5000);
  });

  it("overlaps clips by the transition length, shortening the total", () => {
    const clips = [clip("a", 3000), clip("b", 3000, 1000), clip("c", 3000, 500)];
    const slots = layoutClips(clips);
    expect(slots[1].startMs).toBe(2000);
    expect(slots[2].startMs).toBe(4500);
    expect(totalDuration(clips)).toBe(7500);
  });

  it("never lets a transition exceed half of the shorter neighbour", () => {
    expect(effectiveTransition(clip("a", 1000), clip("b", 4000, 2000))).toBe(500);
    expect(effectiveTransition(clip("a", 4000), clip("b", 4000, 9000))).toBe(2000);
  });

  it("ignores the transition on the first clip and for cuts", () => {
    expect(effectiveTransition(undefined, clip("a", 3000, 1000))).toBe(0);
    expect(effectiveTransition(clip("a", 3000), clip("b", 3000, 1000, "none"))).toBe(0);
  });

  it("reports two visible clips during a transition and holds the last frame at the end", () => {
    const slots = layoutClips([clip("a", 3000), clip("b", 3000, 1000)]);
    expect(slotsAt(slots, 1000).map((s) => s.clip.id)).toEqual(["a"]);
    expect(slotsAt(slots, 2500).map((s) => s.clip.id)).toEqual(["a", "b"]);
    expect(slotsAt(slots, 5000).map((s) => s.clip.id)).toEqual(["b"]);
    expect(slotsAt(slots, 99999).map((s) => s.clip.id)).toEqual(["b"]);
    expect(slotsAt([], 0)).toEqual([]);
  });
});

describe("timeline editing", () => {
  const clips = [clip("a", 3000), clip("b", 3000), clip("c", 3000)];

  it("reorders without mutating the original", () => {
    const next = reorderClips(clips, 0, 2);
    expect(next.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(clips.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("duplicates a clip right after the original with a new id", () => {
    const { clips: next, newId } = duplicateClip(clips, "b");
    expect(next).toHaveLength(4);
    expect(next[2].id).toBe(newId);
    expect(next[2].id).not.toBe("b");
    expect(next[2].sourceId).toBe("s_b");
  });

  it("removes a clip and clamps durations to the allowed range", () => {
    expect(removeClip(clips, "b").map((c) => c.id)).toEqual(["a", "c"]);
    expect(setClipDuration(clips, "a", 10)[0].durationMs).toBe(800);
    expect(setClipDuration(clips, "a", 99999)[0].durationMs).toBe(15000);
    expect(setClipDuration(clips, "a", 4210.4)[0].durationMs).toBe(4210);
  });

  it("snaps clip lengths to whole beats", () => {
    const snapped = snapClipsToBeat([clip("a", 3100), clip("b", 900)], 500, 2);
    expect(snapped.map((c) => c.durationMs)).toEqual([3000, 1000]);
    expect(snapClipsToBeat(clips, 0)).toHaveLength(3);
  });

  it("builds an evenly spaced beat grid", () => {
    expect(beatGrid(500, 100, 1600)).toEqual([100, 600, 1100, 1600]);
    expect(beatGrid(0, 0, 1000)).toEqual([]);
  });
});

describe("text overlays follow the timeline", () => {
  const base = {
    id: "t", kind: "custom" as const, text: "Hi", font: "dm-sans" as const, sizePct: 4, weight: 600 as const, italic: false, uppercase: false,
    tracking: 0, color: "#fff", align: "center" as const, x: 0.5, y: 0.5, shadow: true, animation: "fade" as const,
  };
  const clips = [clip("a", 3000), clip("b", 3000, 1000)];

  it("resolves start, end and clip anchors", () => {
    const overlays = resolveOverlays({
      clips,
      overlays: [
        { ...base, id: "s", anchor: { type: "start" }, offsetMs: 300, durationMs: 1000 },
        { ...base, id: "e", anchor: { type: "end" }, offsetMs: 200, durationMs: 1000 },
        { ...base, id: "c", anchor: { type: "clip", clipId: "b" }, offsetMs: 500, durationMs: 1000 },
        { ...base, id: "gone", anchor: { type: "clip", clipId: "zzz" }, offsetMs: 0, durationMs: 1000 },
      ],
    });
    const byId = Object.fromEntries(overlays.map((o) => [o.overlay.id, [o.startMs, o.endMs]]));
    expect(byId.s).toEqual([300, 1300]);
    expect(byId.e).toEqual([3800, 4800]); // total is 5000
    expect(byId.c).toEqual([2500, 3500]); // clip b starts at 2000
    expect(byId.gone).toBeUndefined();
  });

  it("keeps clip-anchored overlays with their clip after a reorder", () => {
    const overlay = { ...base, anchor: { type: "clip", clipId: "b" } as const, offsetMs: 0, durationMs: 1000 };
    const reordered = [clips[1], clips[0]];
    const [r] = resolveOverlays({ clips: reordered, overlays: [overlay] });
    expect(r.startMs).toBe(0);
  });

  it("re-anchors a dragged overlay and drops overlays of removed clips", () => {
    const slots = layoutClips(clips);
    const moved = placeOverlay({ ...base, anchor: { type: "start" }, offsetMs: 0, durationMs: 1000 }, 1200, 1500, slots, 5000);
    expect(moved.anchor).toEqual({ type: "free" });
    expect(moved.offsetMs).toBe(1200);
    const followed = placeOverlay({ ...base, anchor: { type: "clip", clipId: "b" }, offsetMs: 0, durationMs: 1000 }, 2600, 1000, slots, 5000);
    expect(followed.anchor).toEqual({ type: "clip", clipId: "b" });
    expect(followed.offsetMs).toBe(600);
    const kept = dropOverlaysOfClip([{ ...base, anchor: { type: "clip", clipId: "a" }, offsetMs: 0, durationMs: 500 }, { ...base, id: "x", anchor: { type: "start" }, offsetMs: 0, durationMs: 500 }], "a");
    expect(kept.map((o) => o.id)).toEqual(["x"]);
  });
});

describe("undo and redo", () => {
  it("steps back and forward and clears redo after a new edit", () => {
    let h = createHistory(1);
    h = commit(h, 2);
    h = commit(h, 3);
    h = undo(h);
    expect(h.present).toBe(2);
    h = redo(h);
    expect(h.present).toBe(3);
    h = undo(undo(h));
    h = commit(h, 9);
    expect(h.future).toEqual([]);
    expect(redo(h).present).toBe(9);
  });

  it("merges rapid edits with the same key into one step", () => {
    let h = createHistory(0);
    h = commit(h, 1, "slider", 1000);
    h = commit(h, 2, "slider", 1200);
    h = commit(h, 3, "slider", 1400);
    expect(h.past).toEqual([0]);
    h = commit(h, 4, "slider", 9000);
    expect(h.past).toEqual([0, 3]);
  });

  it("ignores no-op commits", () => {
    const h = createHistory({ a: 1 });
    expect(commit(h, h.present)).toBe(h);
  });
});

describe("default project", () => {
  const sources: ReelSource[] = [1, 2, 3].map((n) => ({
    id: `p${n}`, name: `p${n}`, url: `https://example.test/${n}.jpg`, width: 4000, height: 3000,
    caption: n === 2 ? "Tea at dawn" : "", location: n === 1 ? "Munnar" : "", local: false, focusX: 50, focusY: 50,
  }));
  const brief: ReelTripBrief = {
    tripId: "t1", title: "Monsoon in Munnar", startDate: "2025-07-02", endDate: "2025-07-05",
    theme: {
      destinationName: "Munnar", tagline: "", signOff: "", paletteName: "Tea", ink: "#111", primary: "#2e5a3a", accent: "#7a9a3a", paper: "#f3f1e7",
      headingFont: "cormorant", bodyFont: "nunito-sans", scriptFont: "caveat", headingWeight: 600, headingItalic: false, headingUppercase: false,
    },
    sources,
  };

  it("creates a polished draft from the memory's photos in one step", () => {
    const project = buildProject(brief);
    expect(project.clips).toHaveLength(3);
    expect(project.aspect).toBe("9:16");
    expect(project.overlays.some((o) => o.kind === "title" && o.text === "Monsoon in Munnar")).toBe(true);
    expect(project.overlays.some((o) => o.kind === "closing")).toBe(true);
    expect(project.overlays.some((o) => o.kind === "location" && o.text === "Munnar")).toBe(true);
    expect(project.overlays.some((o) => o.kind === "caption" && o.text === "Tea at dawn")).toBe(true);
    expect(totalDuration(project.clips)).toBeGreaterThan(5000);
  });

  it("every clip-anchored overlay points at a real clip", () => {
    const project = buildProject(brief, { presetKey: "adventure" });
    const ids = new Set(project.clips.map((c) => c.id));
    for (const o of project.overlays) if (o.anchor.type === "clip") expect(ids.has(o.anchor.clipId)).toBe(true);
  });

  it("uses the chosen photos and falls back to the first preset for unknown keys", () => {
    const project = buildProject(brief, { sourceIds: ["p3", "p1"], presetKey: "nope" });
    expect(project.clips.map((c) => c.sourceId)).toEqual(["p3", "p1"]);
    expect(project.presetKey).toBe("cinematic-travel");
  });

  it("drops clips whose photos are gone when a saved draft is reopened", () => {
    const project = buildProject(brief);
    const { project: next, dropped } = reconcileProject(project, sources.slice(0, 2));
    expect(dropped).toBe(1);
    expect(next.clips).toHaveLength(2);
    for (const o of next.overlays) if (o.anchor.type === "clip") expect(next.clips.some((c) => c.id === (o.anchor as { clipId: string }).clipId)).toBe(true);
  });

  it("returns an empty reel for a memory without photos", () => {
    const project = buildProject({ ...brief, sources: [] });
    expect(project.clips).toEqual([]);
    expect(project.overlays).toEqual([]);
  });
});
