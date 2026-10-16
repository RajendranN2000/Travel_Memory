import { describe, expect, it } from "vitest";
import { applyFilterToPixels, DEFAULT_FILTER, filterMatrix, isNeutral } from "@/features/book/filters";
import { containRect } from "@/features/book/image-fit";
import { makeImage, makePage, makeText, roleStyle } from "@/features/book/elements";
import { applyLayout } from "@/features/book/layouts";
import { lintPage } from "@/features/book/lint";
import { autoFitProject, discardUnplaced, placeUnplaced, setImageMode, unplacedToNewPage } from "@/features/book/ops";
import { renderPage } from "@/features/book/display-list";
import { spineWidthMm } from "@/features/book/pdf";
import { bookTemplateFor, buildBook, getTemplate, TEMPLATES, THEMES } from "@/features/book/templates";
import { layoutText, type Measurer } from "@/features/book/text-layout";
import type { BookBrief, BookSource, ImageElement, TextElement } from "@/features/book/types";
import { rectContains } from "@/features/book/units";

const fake: Measurer = {
  width: (_f, text, sizePt, tracking) => [...text].length * (sizePt * 0.5 + tracking),
  metrics: () => ({ ascent: 0.9, descent: 0.25 }),
  hasGlyph: () => true,
};

const sources: BookSource[] = [
  { id: "wide", name: "Wide", url: null, width: 4000, height: 1000, caption: "A long, long panorama of the valley", location: "Munnar", takenOn: "2025-07-02", local: false },
  { id: "tall", name: "Tall", url: null, width: 1000, height: 4000, caption: "", location: "", takenOn: null, local: false },
  { id: "square", name: "Square", url: null, width: 3000, height: 3000, caption: "Tea", location: "Top Station", takenOn: "2025-07-03", local: false },
];
const sizes = new Map(sources.map((s) => [s.id, { width: s.width, height: s.height }]));
const brief: BookBrief = {
  tripId: "t", title: "A very long title that has a lot of words in it to force shrinking", description: "Short.", startDate: null, endDate: null,
  destinationName: "Munnar", region: "Kerala", country: "India", tagline: "Tea hills.", bestSeason: "Winter", knownFor: ["Tea"], elevation: "",
  theme: { paper: "#f3f1e7", ink: "#1b2a1f", muted: "#4d5c50", primary: "#2e5a3a", accent: "#7a9a3a", secondary: "#dce5d3" }, sources,
};
const settings = { format: "a4-portrait" as const, widthMm: 210, heightMm: 297, bleedMm: 3, marginMm: 14, safeMm: 8, cropMarks: false, paperMm: 0.1, showFolios: true };

describe("colour filters", () => {
  it("leaves a neutral filter alone and makes black & white neutral in colour", () => {
    expect(isNeutral(DEFAULT_FILTER)).toBe(true);
    const px = new Uint8ClampedArray([200, 80, 40, 255, 10, 200, 90, 255]);
    const before = Array.from(px);
    applyFilterToPixels(px, DEFAULT_FILTER);
    expect(Array.from(px)).toEqual(before);
    applyFilterToPixels(px, { ...DEFAULT_FILTER, preset: "bw" });
    expect(Math.abs(px[0] - px[1])).toBeLessThanOrEqual(1);
    expect(Math.abs(px[1] - px[2])).toBeLessThanOrEqual(1);
    expect(px[3]).toBe(255);
  });

  it("brightens, and always produces a 4x5 matrix for the preview", () => {
    const px = new Uint8ClampedArray([100, 100, 100, 255]);
    applyFilterToPixels(px, { ...DEFAULT_FILTER, brightness: 0.5 });
    expect(px[0]).toBeGreaterThan(100);
    for (const preset of ["none", "bw", "sepia", "warm", "cool", "vivid", "fade"] as const) expect(filterMatrix({ ...DEFAULT_FILTER, preset })).toHaveLength(20);
  });
});

describe("frames that hug their photos", () => {
  const theme = THEMES.diary;
  const page = makePage("content", theme, { elements: [makeImage({ x: 0, y: 0, w: 10, h: 10 }, "wide"), makeImage({ x: 0, y: 0, w: 10, h: 10 }, "tall")] });

  it("fit the whole photo inside the layout slot with the photo's own proportions", () => {
    const { page: laid } = applyLayout(page, "two-side", theme, settings, sizes);
    for (const el of laid.elements.filter((e): e is ImageElement => e.type === "image")) {
      const src = sizes.get(el.sourceId!)!;
      expect(el.slot).toBeDefined();
      expect(rectContains(el.slot!, el.frame, 0.01)).toBe(true);
      expect(el.frame.w / el.frame.h).toBeCloseTo(src.width / src.height, 3);
    }
  });

  it("go back to the full slot for Fill and re-hug for Fit whole photo", () => {
    const project = { ...buildBook(getTemplate("print-album")!, brief), pages: [applyLayout(page, "two-side", theme, settings, sizes).page] };
    const img = project.pages[0].elements.find((e): e is ImageElement => e.type === "image")!;
    const src = sources.find((s) => s.id === img.sourceId);
    const filled = setImageMode(project, project.pages[0].id, img.id, "fill", src).pages[0].elements.find((e) => e.id === img.id) as ImageElement;
    expect(filled.frame).toEqual(img.slot);
    const back = setImageMode({ ...project, pages: [{ ...project.pages[0], elements: project.pages[0].elements.map((e) => (e.id === img.id ? filled : e)) }] }, project.pages[0].id, img.id, "contain", src).pages[0].elements.find((e) => e.id === img.id) as ImageElement;
    expect(back.frame).toEqual(containRect(img.slot!, src!.width / src!.height));
  });
});

describe("fitting text and keeping unplaced content", () => {
  it("shrinks overflowing text in a new book, and only that", () => {
    const project = buildBook(getTemplate("editorial-magazine")!, brief);
    expect(project.needsFit).toBe(true);
    const fitted = autoFitProject(project, fake);
    expect(fitted.needsFit).toBe(false);
    for (const page of fitted.pages) {
      for (const el of page.elements) {
        if (el.type === "text" && el.field === "none" && el.text.trim()) {
          const out = layoutText(el, { measurer: fake });
          const orig = project.pages.find((p) => p.id === page.id)!.elements.find((e) => e.id === el.id) as TextElement;
          if (layoutText(orig, { measurer: fake }).overflow) expect(out.overflow, `${page.kind} ${el.role}`).toBe(false);
          else expect(el.style.sizePt).toBe(orig.style.sizePt);
        }
      }
    }
  });

  it("lets the visitor place, discard or move unplaced items without losing anything", () => {
    const base = buildBook(getTemplate("print-album")!, brief);
    const theme = base.theme;
    const three = makePage("content", theme, { elements: ["wide", "tall", "square"].map((id) => makeImage({ x: 0, y: 0, w: 10, h: 10 }, id)) });
    const parked = { ...base, pages: [applyLayout(three, "photo-caption", theme, base.settings, sizes).page] };
    const page = parked.pages[0];
    expect(page.unplaced).toHaveLength(2);

    const placed = placeUnplaced(parked, page.id, page.unplaced[0].id);
    expect(placed.pages[0].unplaced).toHaveLength(1);
    expect(placed.pages[0].elements.filter((e) => e.type === "image")).toHaveLength(2);
    const img = placed.pages[0].elements.filter((e): e is ImageElement => e.type === "image").pop()!;
    expect(rectContains({ x: 0, y: 0, w: 210, h: 297 }, img.frame)).toBe(true);

    const moved = unplacedToNewPage(placed, page.id);
    expect(moved.project.pages).toHaveLength(2);
    expect(moved.project.pages[0].unplaced).toHaveLength(0);
    expect(moved.project.pages[1].elements.filter((e) => e.type === "image")).toHaveLength(1);

    expect(discardUnplaced(parked, page.id).pages[0].unplaced).toHaveLength(0);
  });

  it("warns on the page when something is waiting to be placed", () => {
    const base = buildBook(getTemplate("print-album")!, brief);
    const three = makePage("content", base.theme, { elements: ["wide", "tall", "square"].map((id) => makeImage({ x: 0, y: 0, w: 10, h: 10 }, id)) });
    const page = applyLayout(three, "photo-caption", base.theme, base.settings, sizes).page;
    const project = { ...base, pages: [page] };
    const r = renderPage(project, page, { measurer: fake, sources: sizes, pageNumber: 1 });
    expect(lintPage(project, page, 0, r).map((i) => i.code)).toContain("unplaced-content");
  });
});

describe("book facts", () => {
  it("every memory template maps to a real book template", () => {
    for (const slug of ["horizon-poster", "field-journal", "contact-sheet", "day-by-day", "unknown"]) expect(getTemplate(bookTemplateFor(slug))).toBeDefined();
  });

  it("estimates the spine from the page count and paper", () => {
    const project = buildBook(TEMPLATES[0], brief);
    expect(spineWidthMm({ pages: project.pages, settings: { ...project.settings, paperMm: 0.1 } })).toBeCloseTo(Math.max(2, project.pages.length * 0.1), 1);
    expect(spineWidthMm({ pages: Array(100).fill(project.pages[0]), settings: { ...project.settings, paperMm: 0.1 } })).toBe(10);
  });

  it("keeps styles available only where the font really has them", () => {
    const style = roleStyle("body", THEMES.diary, 1, 1);
    const el = makeText("body", { x: 0, y: 0, w: 50, h: 20 }, "Hello", { ...style, font: "caveat", italic: true, bold: true });
    const out = layoutText(el, { measurer: fake });
    expect(out.font.italic).toBe(false); // Caveat has no italic, so it is not faked
    expect(out.font.bold).toBe(true);
  });
});
