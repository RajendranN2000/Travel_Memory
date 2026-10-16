// @vitest-environment node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFName } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { FontStore } from "@/features/book/fonts";
import { exportPdf, pdfPageCount, PdfCancelled, PdfExportError, spineWidthMm, spreadGroups, type PdfImageProvider, type PdfOptions } from "@/features/book/pdf";
import { buildBook, TEMPLATES } from "@/features/book/templates";
import type { BookBrief, BookSource } from "@/features/book/types";
import { mmToPt } from "@/features/book/units";

// A real 1x1 PNG, so embedding exercises the actual image path.
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));

const sources: BookSource[] = Array.from({ length: 7 }, (_, i) => ({
  id: `p${i + 1}`, name: `Photo ${i + 1}`, url: null, width: 4000, height: 3000, caption: i % 2 ? "Mist over the tea rows" : "", location: "Munnar", takenOn: null, local: false,
}));

const brief: BookBrief = {
  tripId: "t", title: "Three slow days above the clouds", description: "We drove up before sunrise.\n\nThe tea rows ran down every hill.",
  startDate: "2025-07-02", endDate: "2025-07-05", destinationName: "Munnar", region: "Kerala", country: "India", tagline: "Tea-clipped hills.",
  bestSeason: "September to March", knownFor: ["Tea estates"], elevation: "1,600 m",
  theme: { paper: "#f3f1e7", ink: "#1b2a1f", muted: "#4d5c50", primary: "#2e5a3a", accent: "#7a9a3a", secondary: "#dce5d3" }, sources,
};

const provider = (fail = false): PdfImageProvider => ({
  size: (id) => (id.startsWith("p") ? { width: 4000, height: 3000 } : undefined),
  render: async () => {
    if (fail) throw new Error("blocked by CORS");
    return { bytes: PNG, format: "png", width: 1, height: 1 };
  },
  name: () => "Photo",
});

async function fonts() {
  const store = new FontStore(async (url) => new Uint8Array(await readFile(path.join(process.cwd(), "public", url))));
  return store;
}

const base: PdfOptions = { scope: "all", quality: "print", includeBleed: true, cropMarks: false };

describe("PDF export", () => {
  const template = TEMPLATES.find((t) => t.key === "print-a4-portrait")!;
  const project = buildBook(template, brief);

  it("writes every page at the exact physical size, including bleed", async () => {
    const out = await exportPdf(project, { fonts: await fonts(), images: provider() }, base);
    expect(out.pageCount).toBe(project.pages.length);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(project.pages.length);
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(mmToPt(210 + 6), 1);
      expect(height).toBeCloseTo(mmToPt(297 + 6), 1);
      const trim = page.getTrimBox();
      expect(trim.width).toBeCloseTo(mmToPt(210), 1);
      expect(trim.height).toBeCloseTo(mmToPt(297), 1);
      expect(trim.x).toBeCloseTo(mmToPt(3), 1);
    }
  }, 60000);

  it("can export at the trim size with no bleed", async () => {
    const out = await exportPdf(project, { fonts: await fonts(), images: provider() }, { ...base, scope: "page", pageIndex: 1, includeBleed: false });
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(mmToPt(210), 1);
  }, 60000);

  it("adds room outside the bleed for crop marks", async () => {
    const out = await exportPdf(project, { fonts: await fonts(), images: provider() }, { ...base, scope: "page", pageIndex: 0, cropMarks: true });
    const page = (await PDFDocument.load(out.bytes)).getPage(0);
    expect(page.getWidth()).toBeCloseTo(mmToPt(210 + 2 * (3 + 9)), 1);
    expect(page.getTrimBox().x).toBeCloseTo(mmToPt(12), 1);
  }, 60000);

  it("exports facing-page spreads at twice the page width", async () => {
    const out = await exportPdf(project, { fonts: await fonts(), images: provider() }, { ...base, scope: "spreads", includeBleed: false });
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(pdfPageCount(project, { scope: "spreads" }));
    const sizes = doc.getPages().map((p) => Math.round((p.getWidth() / mmToPt(210)) * 10) / 10);
    expect(sizes[0]).toBe(2); // cover on the right of a spread-wide sheet, so the sheet stays aligned
    expect(sizes.every((s) => s === 2)).toBe(true);
  }, 60000);

  it("exports a cover wrap: back, spine and front on one sheet", async () => {
    const out = await exportPdf(project, { fonts: await fonts(), images: provider() }, { ...base, scope: "cover-wrap" });
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(1);
    const spine = spineWidthMm(project);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(mmToPt(2 * 210 + spine + 6), 1);
  }, 60000);

  it("reports progress and honours cancellation", async () => {
    const stages: string[] = [];
    await exportPdf(project, { fonts: await fonts(), images: provider() }, base, (p) => stages.push(p.stage));
    expect(stages[0]).toBe("preparing");
    expect(stages).toContain("pages");
    expect(stages[stages.length - 1]).toBe("saving");

    const ac = new AbortController();
    ac.abort();
    await expect(exportPdf(project, { fonts: await fonts(), images: provider() }, base, undefined, ac.signal)).rejects.toBeInstanceOf(PdfCancelled);
  }, 60000);

  it("stops with a clear, recoverable error when a photo cannot be loaded, and can skip it on request", async () => {
    await expect(exportPdf(project, { fonts: await fonts(), images: provider(true) }, base)).rejects.toMatchObject({ name: "PdfExportError", recoverable: true });
    const skipped = await exportPdf(project, { fonts: await fonts(), images: provider(true) }, { ...base, skipBrokenImages: true });
    expect(skipped.warnings.join(" ")).toMatch(/left out/);
  }, 60000);

  it("refuses to export a book with nothing to export", async () => {
    await expect(exportPdf({ ...project, pages: [] }, { fonts: await fonts(), images: provider() }, base)).rejects.toBeInstanceOf(PdfExportError);
  });

  it("embeds the fonts it draws with", async () => {
    const out = await exportPdf(project, { fonts: await fonts(), images: provider() }, { ...base, scope: "page", pageIndex: 0 });
    const doc = await PDFDocument.load(out.bytes);
    const types = doc.context.enumerateIndirectObjects().map(([, obj]) => String((obj as { get?: (n: unknown) => unknown }).get?.(PDFName.of("Type")) ?? ""));
    expect(types.some((x) => x.includes("FontDescriptor"))).toBe(true);
  }, 60000);

  it("orders spreads with the cover and back cover alone", () => {
    expect(spreadGroups(8)).toEqual([[0], [1, 2], [3, 4], [5, 6], [7]]);
    expect(spreadGroups(1)).toEqual([[0]]);
    expect(spreadGroups(0)).toEqual([]);
  });
});
