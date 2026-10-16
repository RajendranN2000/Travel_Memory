import { describe, expect, it } from "vitest";
import { placeImage, originalFrame } from "@/features/book/image-fit";
import { renderPage } from "@/features/book/display-list";
import { makeImage, makePage, makeText, roleStyle } from "@/features/book/elements";
import { applyLayout, getLayout, LAYOUTS, layoutCtx } from "@/features/book/layouts";
import { lintPage } from "@/features/book/lint";
import { addPage, applyTheme, clampFrame, copyPageFormat, deletePage, duplicatePage, movePage, setImageMode, setPageLayout } from "@/features/book/ops";
import { buildBook, contentsText, previewPages, TEMPLATES, THEMES } from "@/features/book/templates";
import { layoutText, type Measurer } from "@/features/book/text-layout";
import type { BookBrief, BookProject, BookSource, ImageElement } from "@/features/book/types";
import { formatFor, outsideFraction, pageGeometry, rectContains, type Rect } from "@/features/book/units";

/** Every character is half the font size wide. */
const fake: Measurer = {
  width: (_f, text, sizePt, tracking) => [...text].length * (sizePt * 0.5 + tracking),
  metrics: () => ({ ascent: 0.9, descent: 0.25 }),
  hasGlyph: (_f, cp) => cp < 0x0d00 || cp > 0x0dff, // pretend there is no Malayalam
};

const sources: BookSource[] = Array.from({ length: 9 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Photo ${i + 1}`,
  url: `https://example.test/${i + 1}.jpg`,
  width: i % 3 === 0 ? 4000 : i % 3 === 1 ? 3000 : 1200,
  height: i % 3 === 0 ? 3000 : i % 3 === 1 ? 4000 : 1200,
  caption: i % 2 ? "Mist over the tea rows" : "",
  location: i % 3 === 0 ? "Munnar" : i % 3 === 1 ? "Top Station" : "",
  takenOn: "2025-07-0" + ((i % 5) + 1),
  local: false,
}));
const sizes = new Map(sources.map((s) => [s.id, { width: s.width, height: s.height }]));

const brief: BookBrief = {
  tripId: "t1",
  title: "Three slow days above the clouds",
  description: "We drove up before sunrise.\n\nThe tea rows ran down every hill.",
  startDate: "2025-07-02",
  endDate: "2025-07-05",
  destinationName: "Munnar",
  region: "Kerala",
  country: "India",
  tagline: "Tea-clipped hills that disappear into the mist.",
  bestSeason: "September to March",
  knownFor: ["Tea estates", "Morning mist"],
  elevation: "About 1,600 m",
  theme: { paper: "#f3f1e7", ink: "#1b2a1f", muted: "#4d5c50", primary: "#2e5a3a", accent: "#7a9a3a", secondary: "#dce5d3" },
  sources,
};

const emptyBrief: BookBrief = { ...brief, sources: [], description: "" };

function allFramesInside(project: BookProject, tolerance = 0.05) {
  const g = pageGeometry(project.settings, project.settings.bleedMm, project.settings.marginMm, project.settings.safeMm);
  const bad: string[] = [];
  project.pages.forEach((page, i) => {
    for (const el of page.elements) {
      const area: Rect = el.type === "image" && el.fullBleed && page.fullBleed ? g.bleed : g.trim;
      if (!rectContains(area, el.frame, tolerance)) bad.push(`page ${i + 1} ${el.type} ${JSON.stringify(el.frame)}`);
    }
  });
  return bad;
}

describe("print geometry", () => {
  it("keeps trim, bleed, content and safe areas separate", () => {
    const g = pageGeometry({ widthMm: 210, heightMm: 297 }, 3, 14, 8);
    expect(g.trim).toEqual({ x: 0, y: 0, w: 210, h: 297 });
    expect(g.bleed).toEqual({ x: -3, y: -3, w: 216, h: 303 });
    expect(g.content).toEqual({ x: 14, y: 14, w: 182, h: 269 });
    expect(g.safe).toEqual({ x: 8, y: 8, w: 194, h: 281 });
  });

  it("knows the standard sizes and clamps custom ones", () => {
    expect(formatFor("a4-landscape")).toMatchObject({ widthMm: 297, heightMm: 210 });
    expect(formatFor("a5-portrait")).toMatchObject({ widthMm: 148, heightMm: 210 });
    expect(formatFor("custom", { widthMm: 5, heightMm: 9999 })).toMatchObject({ widthMm: 50, heightMm: 500 });
  });

  it("measures how much of a box lies outside another", () => {
    const page: Rect = { x: 0, y: 0, w: 100, h: 100 };
    expect(outsideFraction(page, { x: 10, y: 10, w: 20, h: 20 })).toBe(0);
    expect(outsideFraction(page, { x: 90, y: 0, w: 20, h: 100 })).toBeCloseTo(0.5, 5);
  });
});

describe("text layout", () => {
  const style = { ...roleStyle("body", THEMES["editorial-luxury"], 1, 1), sizePt: 10, trackingPt: 0, align: "left" as const };
  const box = (text: string, frame: Rect, extra = {}) => makeText("body", frame, text, style, extra);

  it("wraps on words and keeps explicit paragraph breaks", () => {
    const el = box("one two three four five\n\nsix", { x: 0, y: 0, w: 30, h: 100 }); // 10pt * 0.5 = 1.76mm per char
    const out = layoutText(el, { measurer: fake });
    expect(out.lines.length).toBeGreaterThan(2);
    expect(out.overflow).toBe(false);
    for (const l of out.lines) expect(l.width).toBeLessThanOrEqual(30.01);
  });

  it("reports overflow instead of silently dropping text", () => {
    const el = box("word ".repeat(200), { x: 0, y: 0, w: 40, h: 10 });
    const out = layoutText(el, { measurer: fake });
    expect(out.overflow).toBe(true);
    expect(out.hiddenLines).toBeGreaterThan(0);
    for (const l of out.lines) expect(l.y).toBeLessThanOrEqual(10.5);
  });

  it("flows into a second column before it overflows", () => {
    const text = "word ".repeat(22);
    const one = layoutText(box(text, { x: 0, y: 0, w: 60, h: 30 }, { columns: 1 }), { measurer: fake });
    const two = layoutText(box(text, { x: 0, y: 0, w: 60, h: 30 }, { columns: 2 }), { measurer: fake });
    expect(two.overflow).toBe(false);
    expect(one.overflow).toBe(false);
    expect(new Set(two.lines.map((l) => Math.round(l.segments[0].x))).size).toBe(2);
  });

  it("breaks a word that is wider than the column", () => {
    const out = layoutText(box("supercalifragilisticexpialidocious", { x: 0, y: 0, w: 20, h: 100 }), { measurer: fake });
    expect(out.lines.length).toBeGreaterThan(1);
  });

  it("centres and justifies lines inside the box", () => {
    const centred = layoutText(box("hi", { x: 10, y: 0, w: 100, h: 20 }, { style: { ...style, align: "center" } }), { measurer: fake });
    const seg = centred.lines[0].segments[0];
    expect(seg.x + centred.lines[0].width / 2).toBeCloseTo(60, 1);
    const justified = layoutText(box("aaa bbb ccc ddd eee fff ggg hhh iii jjj kkk lll", { x: 0, y: 0, w: 40, h: 100 }, { style: { ...style, align: "justify" } }), { measurer: fake });
    expect(justified.lines[0].segments.length).toBeGreaterThan(1);
    expect(justified.lines[0].width).toBeCloseTo(40, 1);
  });

  it("flags characters the font cannot draw", () => {
    const out = layoutText(box("hello അ", { x: 0, y: 0, w: 100, h: 20 }), { measurer: fake });
    expect(out.missingGlyphs).toEqual(["അ"]);
  });

  it("fills page-number fields from the page index", () => {
    const el = makeText("folio", { x: 0, y: 0, w: 20, h: 6 }, "", style, { field: "pageNumber" });
    expect(layoutText(el, { measurer: fake, pageNumber: 7 }).lines[0].segments[0].text).toBe("7");
  });
});

describe("image placement never crops or stretches by accident", () => {
  const geom = pageGeometry({ widthMm: 210, heightMm: 297 }, 3, 14, 8);
  const el = (extra: Partial<ImageElement> = {}) => makeImage({ x: 20, y: 20, w: 100, h: 60 }, "p1", extra);
  const wide = { width: 4000, height: 1000 };
  const tall = { width: 1000, height: 4000 };

  it("contain shows the whole photo inside the frame with its own proportions", () => {
    for (const src of [wide, tall, { width: 3000, height: 3000 }]) {
      const p = placeImage(el(), src, geom, false);
      expect(p.visible).toEqual({ x: 0, y: 0, w: 1, h: 1 });
      expect(p.isCropped).toBe(false);
      expect(rectContains({ x: 20, y: 20, w: 100, h: 60 }, p.clip, 0.001)).toBe(true);
      expect(p.clip.w / p.clip.h).toBeCloseTo(src.width / src.height, 4);
      expect(p.dest).toEqual(p.clip);
    }
  });

  it("fill crops only inside its own frame and reports how much is hidden", () => {
    const p = placeImage(el({ mode: "fill" }), tall, geom, false);
    expect(p.clip).toEqual({ x: 20, y: 20, w: 100, h: 60 });
    expect(p.isCropped).toBe(true);
    expect(p.croppedFraction).toBeGreaterThan(0.5);
    // the drawn image fully covers the frame (no gaps) and its proportions are unchanged
    expect(p.dest.x).toBeLessThanOrEqual(20.001);
    expect(p.dest.y).toBeLessThanOrEqual(20.001);
    expect(p.dest.x + p.dest.w).toBeGreaterThanOrEqual(119.999);
    expect(p.dest.y + p.dest.h).toBeGreaterThanOrEqual(79.999);
    expect(p.dest.w / p.dest.h).toBeCloseTo(0.25, 4);
  });

  it("fill keeps the focus point visible and never moves the photo off its frame", () => {
    for (const focus of [0, 0.3, 1]) {
      const p = placeImage(el({ mode: "fill", focusY: focus, focusX: focus, zoom: 2 }), tall, geom, false);
      expect(p.visible.y).toBeGreaterThanOrEqual(0);
      expect(p.visible.y + p.visible.h).toBeLessThanOrEqual(1.0001);
      expect(p.visible.x + p.visible.w).toBeLessThanOrEqual(1.0001);
    }
  });

  it("custom crop keeps the crop's proportions instead of stretching it", () => {
    const p = placeImage(el({ mode: "custom", crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.25 } }), { width: 4000, height: 3000 }, geom, false);
    expect(p.clip.w / p.clip.h).toBeCloseTo((0.5 * 4000) / (0.25 * 3000), 3);
    expect(rectContains({ x: 20, y: 20, w: 100, h: 60 }, p.clip, 0.001)).toBe(true);
    expect(p.croppedFraction).toBeCloseTo(1 - 0.5 * 0.25, 4);
  });

  it("full-page defaults to the whole photo (contain) and uses the bleed area only for full-bleed photos", () => {
    const inside = placeImage(el({ mode: "full-page" }), tall, geom, false);
    expect(inside.isCropped).toBe(false);
    expect(rectContains(geom.trim, inside.clip, 0.001)).toBe(true);
    const bleed = placeImage(el({ mode: "full-page", fullBleed: true, coverPage: true }), tall, geom, true);
    expect(bleed.clip).toEqual(geom.bleed);
    const notBleed = placeImage(el({ mode: "full-page", fullBleed: true, coverPage: true }), tall, geom, false);
    expect(notBleed.clip).toEqual(geom.trim);
  });

  it("clips to the page even when a frame is pushed off it", () => {
    const p = placeImage(el({ frame: { x: 150, y: 20, w: 150, h: 100 }, mode: "fill" }), wide, geom, false);
    expect(p.clip.x + p.clip.w).toBeLessThanOrEqual(210.001);
  });

  it("original proportions fit the safe area and stay centred", () => {
    const f = originalFrame(tall, geom);
    expect(rectContains(geom.safe, f)).toBe(true);
    expect(f.w / f.h).toBeCloseTo(0.25, 4);
    expect(f.x + f.w / 2).toBeCloseTo(105, 3);
  });

  it("reports the printed resolution", () => {
    const p = placeImage(el(), { width: 2000, height: 1200 }, geom, false); // 100 mm wide
    expect(p.effectiveDpi).toBeCloseTo(2000 / (100 / 25.4), 0);
  });
});

describe("page layouts", () => {
  const formats = ["a4-portrait", "a4-landscape", "a5-portrait", "a5-landscape", "square"] as const;
  const settingsFor = (key: (typeof formats)[number]) => {
    const f = formatFor(key);
    return { format: key, widthMm: f.widthMm, heightMm: f.heightMm, bleedMm: 3, marginMm: 12, safeMm: 7, cropMarks: false, paperMm: 0.1, showFolios: true };
  };

  it("every layout keeps every frame inside the page on every size", () => {
    const theme = THEMES["editorial-luxury"];
    const bad: string[] = [];
    for (const fmt of formats) {
      const settings = settingsFor(fmt);
      const geom = layoutCtx(theme, settings).geom;
      for (const layout of LAYOUTS) {
        const res = layout.build(layoutCtx(theme, settings));
        for (const slot of res.slots) {
          const area = slot.kind === "image" && slot.fullBleed ? geom.bleed : geom.trim;
          if (!rectContains(area, slot.frame, 0.05)) bad.push(`${fmt} ${layout.key} ${slot.kind} ${JSON.stringify(slot.frame)}`);
          if (slot.frame.w <= 0 || slot.frame.h <= 0) bad.push(`${fmt} ${layout.key} empty frame`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("changing layout keeps photos and text, and parks what cannot fit", () => {
    const theme = THEMES.diary;
    const settings = settingsFor("a4-portrait");
    const page = makePage("content", theme, {
      elements: [
        makeImage({ x: 0, y: 0, w: 10, h: 10 }, "p1"),
        makeImage({ x: 0, y: 0, w: 10, h: 10 }, "p2"),
        makeImage({ x: 0, y: 0, w: 10, h: 10 }, "p3"),
        makeText("title", { x: 0, y: 0, w: 10, h: 10 }, "Sunrise", roleStyle("title", theme, 1, 1)),
        makeText("body", { x: 0, y: 0, w: 10, h: 10 }, "A few words", roleStyle("body", theme, 1, 1)),
      ],
    });
    const res = applyLayout(page, "photo-caption", theme, settings); // one photo slot
    const photos = res.page.elements.filter((e) => e.type === "image");
    expect(photos).toHaveLength(1);
    expect(res.unplacedImages).toBe(2);
    expect(res.page.unplaced.filter((e) => e.type === "image").map((e) => (e as ImageElement).sourceId)).toEqual(["p2", "p3"]);
    const texts = res.page.elements.filter((e) => e.type === "text").map((e) => (e.type === "text" ? e.text : ""));
    expect(texts).toContain("A few words");
    expect(res.page.unplaced.some((e) => e.type === "text" && e.text === "Sunrise")).toBe(false); // title fills the heading slot
    const roomy = applyLayout(res.page, "six-gallery", theme, settings);
    expect(roomy.page.elements.filter((e) => e.type === "image")).toHaveLength(6);
    expect(roomy.emptyImageSlots).toBeGreaterThan(0);
    expect(roomy.page.elements.some((e) => e.type === "image" && e.sourceId === "p1")).toBe(true);
  });

  it("looks layouts up by key", () => {
    expect(getLayout("quote")?.name).toMatch(/quote/i);
    expect(getLayout("nope")).toBeUndefined();
    expect(LAYOUTS.length).toBeGreaterThanOrEqual(24);
  });
});

describe("book templates", () => {
  it("offers photo books, magazines and print layouts", () => {
    const by = (c: string) => TEMPLATES.filter((t) => t.category === c).length;
    expect(by("photobook")).toBe(8);
    expect(by("magazine")).toBe(8);
    expect(by("print")).toBeGreaterThanOrEqual(7);
  });

  it("builds a sound book from every template", () => {
    for (const t of TEMPLATES) {
      const project = buildBook(t, brief);
      expect(project.pages.length, t.key).toBeGreaterThan(1);
      expect(allFramesInside(project), t.key).toEqual([]);
      const used = new Set<string>();
      for (const p of project.pages) for (const e of p.elements) if (e.type === "image" && e.sourceId) used.add(e.sourceId);
      expect(used.size, `${t.key} should use the photos`).toBeGreaterThanOrEqual(Math.min(5, sources.length));
      if (t.hasCovers) {
        expect(project.pages[0].kind).toBe("cover");
        expect(project.pages[project.pages.length - 1].kind).toBe("back");
      }
    }
  });

  it("builds from a memory with no photos and from a single photo", () => {
    for (const b of [emptyBrief, { ...brief, sources: sources.slice(0, 1) }]) {
      for (const t of TEMPLATES) {
        const project = buildBook(t, b);
        expect(project.pages.length).toBeGreaterThanOrEqual(1);
        expect(allFramesInside(project), t.key).toEqual([]);
      }
    }
  });

  it("gives every inner page a page number except covers", () => {
    const project = buildBook(TEMPLATES[0], brief);
    project.pages.forEach((p) => {
      const folio = p.elements.some((e) => e.type === "text" && e.field === "pageNumber");
      if (p.kind === "cover" || p.kind === "back") expect(folio).toBe(false);
    });
    expect(project.pages.some((p) => p.elements.some((e) => e.type === "text" && e.field === "pageNumber"))).toBe(true);
  });

  it("writes a contents page from the real page list", () => {
    const t = TEMPLATES.find((x) => x.key === "editorial-magazine")!;
    const project = buildBook(t, brief);
    const contents = project.pages.find((p) => p.kind === "contents")!;
    const body = contents.elements.find((e) => e.type === "text" && e.role === "body");
    expect(body && body.type === "text" && body.text.length).toBeGreaterThan(0);
    expect(contentsText(project)).toMatch(/^\d{2} {4}/m);
  });

  it("builds realistic previews for the gallery", () => {
    const { pages } = previewPages(TEMPLATES[0], brief);
    expect(pages.length).toBeGreaterThanOrEqual(2);
  });
});

describe("page rendering and preflight", () => {
  const project = buildBook(TEMPLATES.find((t) => t.key === "editorial-magazine")!, brief);
  const render = (i: number) => renderPage(project, project.pages[i], { measurer: fake, sources: sizes, pageNumber: i + 1 });

  it("draws the background to the bleed edge and never draws images outside their clip", () => {
    const r = render(1);
    expect(r.items[0]).toMatchObject({ type: "rect", rect: r.geometry.bleed });
    for (const item of r.items) if (item.type === "image") expect(rectContains(r.geometry.bleed, item.clip, 0.01)).toBe(true);
  });

  it("flags text that does not fit, photos that leave the page and low resolution", () => {
    const base = project.pages[2];
    const tiny: ImageElement = makeImage({ x: 180, y: 20, w: 100, h: 100 }, "p3", { mode: "fill" }); // 1200px at 100 mm = 305 dpi... make it big
    const huge: ImageElement = makeImage({ x: 10, y: 10, w: 190, h: 270 }, "p3", { mode: "fill" });
    const text = makeText("body", { x: 14, y: 14, w: 30, h: 8 }, "word ".repeat(80), roleStyle("body", project.theme, 1, 1));
    const page = { ...base, elements: [tiny, huge, text] };
    const proj = { ...project, pages: [page] };
    const r = renderPage(proj, page, { measurer: fake, sources: sizes, pageNumber: 1 });
    const issues = lintPage(proj, page, 0, r);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("text-overflow");
    expect(codes).toContain("image-outside-page");
    expect(codes).toContain("image-low-res");
    expect(codes).toContain("image-cropped");
  });

  it("warns when text is closer to the trim than the safe margin", () => {
    const base = project.pages[2];
    const text = makeText("body", { x: 2, y: 2, w: 60, h: 20 }, "Near the edge", roleStyle("body", project.theme, 1, 1));
    const page = { ...base, elements: [text] };
    const proj = { ...project, pages: [page] };
    const r = renderPage(proj, page, { measurer: fake, sources: sizes, pageNumber: 1 });
    expect(lintPage(proj, page, 0, r).map((i) => i.code)).toContain("text-near-trim");
  });
});

describe("editing operations", () => {
  const start = buildBook(TEMPLATES[0], brief);

  it("adds, duplicates, moves and deletes pages", () => {
    const n = start.pages.length;
    const added = addPage(start, 2, "four-grid");
    expect(added.project.pages).toHaveLength(n + 1);
    expect(added.project.pages[2].layoutKey).toBe("four-grid");
    const dup = duplicatePage(added.project, added.page.id);
    expect(dup.project.pages).toHaveLength(n + 2);
    expect(dup.page!.id).not.toBe(added.page.id);
    expect(dup.page!.elements.map((e) => e.id)).not.toEqual(added.page.elements.map((e) => e.id));
    const moved = movePage(dup.project, 3, 1);
    expect(moved.pages[1].id).toBe(dup.page!.id);
    const removed = deletePage(moved, dup.page!.id);
    expect(removed.pages).toHaveLength(n + 1);
  });

  it("never deletes the last page", () => {
    const one = { ...start, pages: [start.pages[0]] };
    expect(deletePage(one, one.pages[0].id).pages).toHaveLength(1);
  });

  it("clamps frames to the page", () => {
    const g = pageGeometry({ widthMm: 210, heightMm: 297 }, 3, 14, 8);
    expect(clampFrame({ x: 200, y: -50, w: 80, h: 40 }, g.trim)).toEqual({ x: 130, y: 0, w: 80, h: 40 });
    expect(clampFrame({ x: 0, y: 0, w: 900, h: 2 }, g.trim)).toMatchObject({ w: 210, h: 4 });
  });

  it("changes the layout of a page without losing its photos", () => {
    const page = start.pages.find((p) => p.kind === "content")!;
    const before = page.elements.filter((e) => e.type === "image" && e.sourceId).map((e) => (e as ImageElement).sourceId);
    const res = setPageLayout(start, page.id, "six-gallery");
    const after = res.project.pages.find((p) => p.id === page.id)!;
    const kept = [...after.elements, ...after.unplaced].filter((e) => e.type === "image" && e.sourceId).map((e) => (e as ImageElement).sourceId);
    for (const id of before) expect(kept).toContain(id);
  });

  it("switching to Original proportions fits the photo in the safe area without cropping", () => {
    const page = start.pages.find((p) => p.elements.some((e) => e.type === "image" && e.sourceId))!;
    const img = page.elements.find((e): e is ImageElement => e.type === "image" && !!e.sourceId)!;
    const src = sources.find((s) => s.id === img.sourceId);
    const next = setImageMode(start, page.id, img.id, "original", src);
    const el = next.pages.find((p) => p.id === page.id)!.elements.find((e) => e.id === img.id) as ImageElement;
    expect(el.mode).toBe("original");
    expect(el.frame.w / el.frame.h).toBeCloseTo(src!.width / src!.height, 3);
  });

  it("applies a theme to the whole book", () => {
    const themed = applyTheme(start, THEMES.cinematic);
    expect(themed.theme.key).toBe("cinematic");
    const bg = themed.pages.filter((p) => p.background.color === THEMES.cinematic.paper).length;
    expect(bg).toBeGreaterThan(0);
  });

  it("copies the look of one page onto another without touching its words", () => {
    const [a, b] = start.pages.filter((p) => p.kind === "content");
    const styled = { ...start, pages: start.pages.map((p) => (p.id === a.id ? { ...p, background: { ...p.background, color: "#123456" } } : p)) };
    const res = copyPageFormat(styled, a.id, b.id);
    const out = res.pages.find((p) => p.id === b.id)!;
    expect(out.background.color).toBe("#123456");
    const texts = (page: typeof out) => page.elements.filter((e) => e.type === "text" && e.field === "none").map((e) => (e.type === "text" ? e.text : ""));
    expect(texts(out)).toEqual(texts(b));
  });
});
