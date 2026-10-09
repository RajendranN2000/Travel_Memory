import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSampleMemory, sampleMemories } from "@/features/memories/samples";
import type { MemoryContent } from "@/features/memories/types";
import { journalBlocks } from "@/features/templates/components/field-journal";
import { timelineGroups } from "@/features/templates/components/day-by-day";
import { templates } from "@/features/templates/registry";
import { MemoryRenderer } from "@/features/templates/render";
import { listDestinationThemes } from "@/features/themes/registry";

const base = getSampleMemory("sample-munnar")!.content;

describe("templates render every destination theme", () => {
  const cases = templates.flatMap((t) =>
    t.layouts.flatMap((l) => listDestinationThemes().map((d) => [t.slug, l.key, d.slug] as const)),
  );

  it.each(cases)("%s / %s / %s", (templateSlug, layout, destinationSlug) => {
    const memory: MemoryContent = { ...base, templateSlug, layout, destinationSlug, palette: null };
    const { container, unmount } = render(<MemoryRenderer memory={memory} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(base.title);
    const root = container.querySelector("[data-destination]");
    expect(root?.getAttribute("data-destination")).toBe(destinationSlug);
    // Theme tokens are applied as CSS variables, not hard-coded colours.
    expect((root as HTMLElement).style.getPropertyValue("--t-primary")).not.toBe("");
    unmount();
  });

  it.each(templates.map((t) => t.slug))("%s shows an empty state without photos", (templateSlug) => {
    render(<MemoryRenderer memory={{ ...base, templateSlug, layout: "", photos: [] }} />);
    expect(screen.getByText(/Add a few photos/)).toBeInTheDocument();
  });

  it("uses captions and places as alt text", () => {
    render(<MemoryRenderer memory={{ ...base, templateSlug: "contact-sheet", layout: "mosaic" }} />);
    expect(screen.getByAltText("The first clear view after two hours of fog. — Lockhart Gap")).toBeInTheDocument();
  });

  it("falls back gracefully for unknown template, layout and destination", () => {
    render(<MemoryRenderer memory={{ ...base, templateSlug: "nope" as never, layout: "x", destinationSlug: "atlantis" }} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(base.title);
  });

  it("every sample memory uses an existing template and destination", () => {
    for (const sample of sampleMemories) {
      expect(sample.slug.startsWith("sample-")).toBe(true);
      expect(sample.content.photos.every((p) => p.src?.startsWith("/images/"))).toBe(true);
    }
  });
});

describe("template layout logic", () => {
  const photo = (id: string, takenOn: string | null, caption = "") => ({ id, src: null, width: 3, height: 2, caption, location: "", takenOn });

  it("groups timeline photos by day relative to the trip start", () => {
    const groups = timelineGroups({
      startDate: "2025-10-02",
      photos: [photo("a", "2025-10-03"), photo("b", null), photo("c", "2025-10-02"), photo("d", "2025-10-03")],
    });
    expect(groups.map((g) => g.label)).toEqual(["Day 1", "Day 2", "More moments"]);
    expect(groups[1].entries.map((e) => e.photo.id)).toEqual(["a", "d"]);
  });

  it("labels undated timelines as moments", () => {
    expect(timelineGroups({ startDate: null, photos: [photo("a", null)] })[0].label).toBe("Moments");
  });

  it("builds an editorial rhythm that uses every photo once", () => {
    const photos = Array.from({ length: 7 }, (_, i) => photo(String(i), null, i === 3 ? "A caption" : ""));
    const blocks = journalBlocks(photos);
    expect(blocks.flatMap((b) => b.photos.map((p) => p.id))).toEqual(photos.map((p) => p.id));
    expect(blocks[0].kind).toBe("wide");
    expect(blocks[1].kind).toBe("pair");
  });
});
