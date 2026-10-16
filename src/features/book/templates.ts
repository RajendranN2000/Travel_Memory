import { formatDate, formatDateRange } from "@/lib/dates";
import { makePage, makeImage, makeText, newId, nowMs, roleStyle, scaleFor, withDeterministicIds } from "./elements";
import { applyLayout, getLayout, layoutCtx } from "./layouts";
import type { BookBrief, BookElement, BookKind, BookPage, BookProject, BookSettings, BookSource, BookTheme, PageKind, TextElement, TextRole } from "./types";
import { formatFor, type FormatKey } from "./units";

// -- themes ---------------------------------------------------------------------------

export const THEMES: Record<string, BookTheme> = {
  "editorial-luxury": {
    key: "editorial-luxury", name: "Editorial luxury", paper: "#faf7f2", ink: "#1c1917", muted: "#78716c", accent: "#a16207", accent2: "#d6b370",
    headingFont: "playfair-display", bodyFont: "lora", scriptFont: "cormorant-garamond", labelFont: "dm-sans", headingBold: false, headingItalic: false,
  },
  "minimal-album": {
    key: "minimal-album", name: "Minimal album", paper: "#ffffff", ink: "#111827", muted: "#6b7280", accent: "#111827", accent2: "#9ca3af",
    headingFont: "outfit", bodyFont: "dm-sans", scriptFont: "cormorant-garamond", labelFont: "dm-sans", headingBold: false, headingItalic: false,
  },
  romantic: {
    key: "romantic", name: "Romantic", paper: "#fdf2f0", ink: "#4a2c2a", muted: "#9a6b66", accent: "#be4d5c", accent2: "#e7a1a8",
    headingFont: "cormorant-garamond", bodyFont: "lora", scriptFont: "caveat", labelFont: "josefin-sans", headingBold: false, headingItalic: true,
  },
  "nature-journal": {
    key: "nature-journal", name: "Nature journal", paper: "#f4f1e8", ink: "#1f2e22", muted: "#5b6b5e", accent: "#3f6b45", accent2: "#9cc58a",
    headingFont: "fraunces", bodyFont: "source-sans-3", scriptFont: "caveat", labelFont: "josefin-sans", headingBold: false, headingItalic: false,
  },
  adventure: {
    key: "adventure", name: "Adventure", paper: "#f1efe9", ink: "#12232e", muted: "#55636d", accent: "#d9622b", accent2: "#f2a03d",
    headingFont: "josefin-sans", bodyFont: "source-sans-3", scriptFont: "caveat", labelFont: "josefin-sans", headingBold: true, headingItalic: false,
  },
  cinematic: {
    key: "cinematic", name: "Cinematic dark", paper: "#121316", ink: "#f5f0e6", muted: "#9a968c", accent: "#e0a458", accent2: "#f5d49a",
    headingFont: "playfair-display", bodyFont: "dm-sans", scriptFont: "cormorant-garamond", labelFont: "dm-sans", headingBold: false, headingItalic: true,
  },
  "food-culture": {
    key: "food-culture", name: "Food and culture", paper: "#fbf3e4", ink: "#3a1f12", muted: "#8a6247", accent: "#c2410c", accent2: "#f59e0b",
    headingFont: "dm-serif-display", bodyFont: "lora", scriptFont: "caveat", labelFont: "dm-sans", headingBold: false, headingItalic: false,
  },
  coastal: {
    key: "coastal", name: "Coastal", paper: "#f3f8f9", ink: "#0f2d3a", muted: "#587684", accent: "#0e7490", accent2: "#67c1d3",
    headingFont: "fraunces", bodyFont: "dm-sans", scriptFont: "caveat", labelFont: "dm-sans", headingBold: false, headingItalic: true,
  },
  diary: {
    key: "diary", name: "Travel diary", paper: "#fffdf7", ink: "#2b2b2b", muted: "#7a7a7a", accent: "#b45309", accent2: "#e0a865",
    headingFont: "caveat", bodyFont: "lora", scriptFont: "caveat", labelFont: "dm-sans", headingBold: true, headingItalic: false,
  },
};

export const THEME_KEYS = Object.keys(THEMES);

/** The theme taken from the memory's own destination colours and type. */
export function destinationTheme(brief: Pick<BookBrief, "theme" | "destinationName">): BookTheme {
  return {
    key: "destination",
    name: `${brief.destinationName || "Destination"} theme`,
    paper: brief.theme.paper,
    ink: brief.theme.ink,
    muted: brief.theme.muted,
    accent: brief.theme.primary,
    accent2: brief.theme.accent,
    headingFont: "dm-serif-display",
    bodyFont: "dm-sans",
    scriptFont: "caveat",
    labelFont: "dm-sans",
    headingBold: false,
    headingItalic: false,
  };
}

export function resolveTheme(key: string, brief: Pick<BookBrief, "theme" | "destinationName">): BookTheme {
  return key === "destination" ? destinationTheme(brief) : (THEMES[key] ?? destinationTheme(brief));
}

// -- templates ----------------------------------------------------------------------------

export type TemplateCategory = "photobook" | "magazine" | "print";

export interface BookTemplate {
  key: string;
  name: string;
  category: TemplateCategory;
  blurb: string;
  format: FormatKey;
  customSize?: { widthMm: number; heightMm: number };
  themeKey: string;
  coverLayout: string;
  /** Content page layouts, used in turn */
  rhythm: string[];
  structure: { title: boolean; dedication: boolean; contents: boolean; intro: boolean; chapterEvery: number; quote: boolean; closing: boolean; back: boolean };
  /** Cover and back cover are part of the book */
  hasCovers: boolean;
  maxContentPages: number;
}

const S = (o: Partial<BookTemplate["structure"]> = {}): BookTemplate["structure"] => ({
  title: true, dedication: false, contents: false, intro: true, chapterEvery: 0, quote: false, closing: true, back: true, ...o,
});

export const TEMPLATES: BookTemplate[] = [
  // Photo books
  { key: "travel-memories", name: "Travel memories", category: "photobook", blurb: "The classic photo book of your trip, in your destination's colours.", format: "square", themeKey: "destination", coverLayout: "cover-photo", rhythm: ["photo-title", "two-side", "three-editorial", "photo-caption", "four-grid", "hero-supporting", "full-overlay"], structure: S({ quote: true }), hasCovers: true, maxContentPages: 40 },
  { key: "couples-album", name: "Couple's travel album", category: "photobook", blurb: "Soft, romantic pages for the two of you.", format: "a5-landscape", themeKey: "romantic", coverLayout: "cover-minimal", rhythm: ["photo-caption", "two-side", "minimal-white", "full-overlay", "three-editorial"], structure: S({ dedication: true, quote: true }), hasCovers: true, maxContentPages: 36 },
  { key: "honeymoon", name: "Honeymoon memories", category: "photobook", blurb: "A keepsake of the first trip together, with room for your words.", format: "a4-landscape", themeKey: "romantic", coverLayout: "cover-photo", rhythm: ["full-overlay", "photo-caption", "two-side", "minimal-white", "hero-supporting", "quote"], structure: S({ dedication: true, quote: true }), hasCovers: true, maxContentPages: 36 },
  { key: "family-vacation", name: "Family vacation book", category: "photobook", blurb: "Lots of photos, simple layouts, easy to share with everyone.", format: "a4-landscape", themeKey: "coastal", coverLayout: "cover-photo", rhythm: ["four-grid", "photo-title", "six-gallery", "two-side", "hero-supporting"], structure: S({ chapterEvery: 6 }), hasCovers: true, maxContentPages: 48 },
  { key: "adventure-journal", name: "Adventure and trekking journal", category: "photobook", blurb: "Bold type, big landscapes and room for trail notes.", format: "a5-portrait", themeKey: "adventure", coverLayout: "cover-photo", rhythm: ["full-overlay", "image-text-column", "timeline", "three-editorial", "locations"], structure: S({ chapterEvery: 5, contents: true }), hasCovers: true, maxContentPages: 40 },
  { key: "nature-collection", name: "Nature and landscape collection", category: "photobook", blurb: "Let the scenery lead. Large photos and quiet captions.", format: "a4-landscape", themeKey: "nature-journal", coverLayout: "cover-photo", rhythm: ["photo-only", "photo-caption", "two-side", "full-overlay", "minimal-white"], structure: S({ quote: true }), hasCovers: true, maxContentPages: 40 },
  { key: "minimalist-album", name: "Minimalist photo album", category: "photobook", blurb: "One photo at a time, framed with plenty of white space.", format: "square", themeKey: "minimal-album", coverLayout: "cover-minimal", rhythm: ["minimal-white", "minimal-white", "two-side"], structure: S({ title: false, intro: false, closing: false }), hasCovers: true, maxContentPages: 40 },
  { key: "yearly-memories", name: "Yearly travel memories", category: "photobook", blurb: "A year of trips, with a chapter for each.", format: "a4-portrait", themeKey: "editorial-luxury", coverLayout: "cover-photo", rhythm: ["hero-supporting", "four-grid", "photo-caption", "six-gallery", "three-editorial"], structure: S({ contents: true, chapterEvery: 4, quote: true }), hasCovers: true, maxContentPages: 60 },

  // Magazines
  { key: "editorial-magazine", name: "Editorial travel magazine", category: "magazine", blurb: "A classic travel magazine with articles, pull quotes and a contents page.", format: "a4-portrait", themeKey: "editorial-luxury", coverLayout: "cover-magazine", rhythm: ["article", "three-editorial", "image-text-column", "full-overlay", "quote", "article"], structure: S({ title: false, contents: true, chapterEvery: 0 }), hasCovers: true, maxContentPages: 40 },
  { key: "luxury-journal", name: "Luxury travel journal", category: "magazine", blurb: "Refined type, gold accents and generous margins.", format: "a5-portrait", themeKey: "editorial-luxury", coverLayout: "cover-minimal", rhythm: ["photo-caption", "article", "minimal-white", "quote", "image-text-column"], structure: S({ dedication: true, contents: true }), hasCovers: true, maxContentPages: 36 },
  { key: "destination-guide", name: "Destination guide", category: "magazine", blurb: "Facts, places and an itinerary: a guide to where you went.", format: "a5-portrait", themeKey: "destination", coverLayout: "cover-magazine", rhythm: ["destination-info", "itinerary", "locations", "photo-caption", "timeline", "four-grid"], structure: S({ title: false, contents: true }), hasCovers: true, maxContentPages: 36 },
  { key: "weekend-getaway", name: "Weekend getaway magazine", category: "magazine", blurb: "A short, punchy magazine for a quick trip.", format: "a5-portrait", themeKey: "coastal", coverLayout: "cover-magazine", rhythm: ["article", "three-editorial", "four-grid", "full-overlay"], structure: S({ title: false, intro: false }), hasCovers: true, maxContentPages: 20 },
  { key: "adventure-editorial", name: "Adventure travel editorial", category: "magazine", blurb: "High-energy spreads for treks, rides and road trips.", format: "a4-portrait", themeKey: "adventure", coverLayout: "cover-magazine", rhythm: ["full-overlay", "article", "hero-supporting", "timeline", "quote"], structure: S({ title: false, contents: true }), hasCovers: true, maxContentPages: 40 },
  { key: "food-culture-magazine", name: "Food and culture magazine", category: "magazine", blurb: "Warm tones for markets, meals and local stories.", format: "a4-portrait", themeKey: "food-culture", coverLayout: "cover-magazine", rhythm: ["article", "three-editorial", "image-text-column", "four-grid", "quote"], structure: S({ title: false, contents: true }), hasCovers: true, maxContentPages: 40 },
  { key: "cinematic-story", name: "Cinematic travel story", category: "magazine", blurb: "Dark pages and full-bleed photography, like a film still book.", format: "a4-landscape", themeKey: "cinematic", coverLayout: "cover-photo", rhythm: ["full-overlay", "photo-caption", "full-overlay", "two-side", "quote"], structure: S({ quote: true }), hasCovers: true, maxContentPages: 36 },
  { key: "travel-diary", name: "Personal travel diary", category: "magazine", blurb: "Handwritten headings and room for your own words.", format: "a5-portrait", themeKey: "diary", coverLayout: "cover-minimal", rhythm: ["photo-caption", "text-page", "two-side", "timeline", "minimal-white"], structure: S({ dedication: true }), hasCovers: true, maxContentPages: 40 },

  // Print and document layouts
  { key: "print-single", name: "Single-page photo prints", category: "print", blurb: "One whole photo per page. Print them, or cut them out.", format: "a4-portrait", themeKey: "minimal-album", coverLayout: "photo-only", rhythm: ["photo-only"], structure: S({ title: false, intro: false, closing: false, back: false }), hasCovers: false, maxContentPages: 100 },
  { key: "print-album", name: "Multi-page photo album", category: "print", blurb: "Several photos per page in a clean album.", format: "a4-portrait", themeKey: "minimal-album", coverLayout: "cover-minimal", rhythm: ["four-grid", "three-editorial", "two-side", "six-gallery"], structure: S({ intro: false, closing: false }), hasCovers: true, maxContentPages: 60 },
  { key: "print-a4-portrait", name: "A4 portrait album", category: "print", blurb: "Standard A4 portrait pages, ready for any printer.", format: "a4-portrait", themeKey: "minimal-album", coverLayout: "cover-photo", rhythm: ["three-editorial", "photo-caption", "four-grid"], structure: S({ intro: false }), hasCovers: true, maxContentPages: 60 },
  { key: "print-a4-landscape", name: "A4 landscape album", category: "print", blurb: "Standard A4 landscape pages.", format: "a4-landscape", themeKey: "minimal-album", coverLayout: "cover-photo", rhythm: ["two-side", "three-editorial", "six-gallery"], structure: S({ intro: false }), hasCovers: true, maxContentPages: 60 },
  { key: "print-a5-portrait", name: "A5 portrait album", category: "print", blurb: "Pocket-sized A5 portrait pages.", format: "a5-portrait", themeKey: "minimal-album", coverLayout: "cover-photo", rhythm: ["photo-caption", "two-side", "four-grid"], structure: S({ intro: false }), hasCovers: true, maxContentPages: 60 },
  { key: "print-a5-landscape", name: "A5 landscape album", category: "print", blurb: "Pocket-sized A5 landscape pages.", format: "a5-landscape", themeKey: "minimal-album", coverLayout: "cover-photo", rhythm: ["two-side", "photo-caption", "three-editorial"], structure: S({ intro: false }), hasCovers: true, maxContentPages: 60 },
  { key: "print-square", name: "Square photo book", category: "print", blurb: "A square book, 200 × 200 mm.", format: "square", themeKey: "minimal-album", coverLayout: "cover-photo", rhythm: ["minimal-white", "two-side", "four-grid", "photo-title"], structure: S({ intro: false }), hasCovers: true, maxContentPages: 60 },
  { key: "print-custom", name: "Custom size book", category: "print", blurb: "Set your own page size to match your printer's template.", format: "custom", customSize: { widthMm: 230, heightMm: 230 }, themeKey: "minimal-album", coverLayout: "cover-photo", rhythm: ["photo-caption", "two-side", "four-grid"], structure: S({ intro: false }), hasCovers: true, maxContentPages: 60 },
];

export const CATEGORY_LABELS: Record<TemplateCategory, { label: string; blurb: string }> = {
  photobook: { label: "Photo books", blurb: "Albums for trips, couples, families and nature." },
  magazine: { label: "Travel magazines", blurb: "Editorial layouts with articles, covers and contents pages." },
  print: { label: "Print and documents", blurb: "A4, A5, square and custom pages for any printer." },
};

export const getTemplate = (key: string | null | undefined): BookTemplate | undefined => TEMPLATES.find((t) => t.key === key);
export const kindFor = (t: BookTemplate): BookKind => (t.category === "photobook" ? "photobook" : t.category === "magazine" ? "magazine" : "print");

export function defaultSettings(t: BookTemplate): BookSettings {
  const f = formatFor(t.format, t.customSize);
  const small = Math.min(f.widthMm, f.heightMm) < 160;
  return {
    format: f.key,
    widthMm: f.widthMm,
    heightMm: f.heightMm,
    bleedMm: 3,
    marginMm: small ? 11 : 14,
    safeMm: small ? 7 : 8,
    cropMarks: false,
    paperMm: 0.1,
    showFolios: t.category !== "print" || t.rhythm[0] !== "photo-only",
  };
}

// -- building a book -----------------------------------------------------------------------------

const firstSentence = (s: string) => (s.trim().match(/^[^.!?\n]+[.!?]?/)?.[0] ?? "").trim();

function uniqueLocations(sources: BookSource[]): string[] {
  return [...new Set(sources.map((s) => s.location.trim()).filter(Boolean))];
}

function textFor(role: TextRole, text: string): TextElement {
  const style = { font: "dm-sans", sizePt: 10, bold: false, italic: false, color: "#000000", align: "left", lineHeight: 1.4, trackingPt: 0, paraSpacingPt: 0, uppercase: false } as const;
  return makeText(role, { x: 0, y: 0, w: 10, h: 10 }, text, { ...style });
}

interface FillData {
  brief: BookBrief;
  dates: string;
  photos: BookSource[];
  index: number;
}

/** The text a layout starts with, from the memory's own words. Nothing is invented: empty slots stay empty for the user to fill. */
function textsForLayout(layoutKey: string, d: FillData): Array<[TextRole, string]> {
  const { brief, dates, photos } = d;
  const first = photos[0];
  const loc = first?.location || "";
  const caps = photos.map((p) => p.caption.trim()).filter(Boolean);
  const caption = caps.join("  ·  ") || loc;
  const desc = brief.description.trim();
  const places = uniqueLocations(brief.sources);
  switch (layoutKey) {
    case "photo-title":
      return [["title", loc || first?.caption || ""], ["subtitle", loc ? dates : brief.destinationName]];
    case "photo-caption":
      return [["heading", loc || first?.caption || ""], ["body", first?.caption && loc ? first.caption : ""]];
    case "two-side":
    case "three-editorial":
    case "four-grid":
    case "six-gallery":
    case "hero-supporting":
      return [["caption", caption]];
    case "minimal-white":
      return [["caption", caption]];
    case "full-overlay":
      return [["heading", loc || first?.caption || ""], ["body", loc ? (first?.caption ?? "") : ""]];
    case "image-text-column":
      return [["label", brief.destinationName], ["heading", loc || first?.caption || ""], ["body", loc ? (first?.caption ?? "") : ""]];
    case "article":
      // The trip description introduces the first article only; later ones carry their own photo's words.
      return d.index === 0
        ? [["label", brief.destinationName], ["title", loc || brief.title], ["subtitle", firstSentence(desc)], ["caption", first?.caption ?? ""], ["body", desc]]
        : [["label", brief.destinationName], ["title", loc || first?.caption || brief.title], ["subtitle", dates], ["caption", ""], ["body", first?.caption ?? ""]];
    case "text-page":
      return [["label", brief.destinationName], ["heading", brief.title], ["body", desc]];
    case "itinerary":
      return [["label", "Itinerary"], ["heading", brief.title], ["body", places.map((p, i) => `Day ${i + 1}   ${p}`).join("\n")]];
    case "destination-info":
      return [
        ["label", "At a glance"],
        ["heading", brief.destinationName],
        ["subtitle", brief.tagline],
        ["meta", "Best season"],
        ["body", brief.bestSeason + (brief.elevation ? `\nElevation: ${brief.elevation}` : "")],
        ["meta", "Known for"],
        ["body", brief.knownFor.join("\n")],
      ];
    case "locations":
      return [["label", "Where we went"], ["heading", "Places"], ["body", places.join("\n")]];
    case "timeline":
      return [["label", "Our journey"], ["heading", "Day by day"], ["body", brief.sources.filter((s) => s.location || s.takenOn).slice(0, 8).map((s) => [s.takenOn ? formatDate(s.takenOn) : "", s.location].filter(Boolean).join("   ")).join("\n")]];
    case "quote":
      return [["label", "A memory"], ["quote", brief.tagline], ["meta", brief.destinationName]];
    default:
      return [];
  }
}

let buildSizes: ReadonlyMap<string, { width: number; height: number }> | undefined;

function pageWith(kind: PageKind, theme: BookTheme, layoutKey: string, settings: BookSettings, images: BookSource[], texts: Array<[TextRole, string]>, extra: Partial<BookPage> = {}): BookPage {
  const elements: BookElement[] = [
    ...images.map((s) => makeImage({ x: 0, y: 0, w: 10, h: 10 }, s.id, { alt: s.caption || s.location || s.name })),
    ...texts.map(([role, text]) => textFor(role, text)),
  ];
  const page = makePage(kind, theme, { elements, ...extra });
  return applyLayout(page, layoutKey, theme, settings, buildSizes).page;
}

export interface BuildOptions {
  /** Only these photos, in this order. Defaults to all the memory's photos. */
  sourceIds?: string[];
  themeKey?: string;
  title?: string;
  kind?: BookKind;
  tripId?: string;
}

/** Builds a complete, editable book from a template and a memory's photos and words. */
export function buildBook(template: BookTemplate, brief: BookBrief, options: BuildOptions = {}): BookProject {
  const theme = resolveTheme(options.themeKey ?? template.themeKey, brief);
  const settings = defaultSettings(template);
  const byId = new Map(brief.sources.map((s) => [s.id, s]));
  buildSizes = new Map(brief.sources.map((s) => [s.id, { width: s.width, height: s.height }]));
  const pool = (options.sourceIds ?? brief.sources.map((s) => s.id)).map((id) => byId.get(id)).filter((s): s is BookSource => Boolean(s));
  const title = (options.title ?? brief.title).trim() || brief.destinationName || "My travel memories";
  const dates = formatDateRange(brief.startDate, brief.endDate);
  const eff: BookBrief = { ...brief, title };
  const data = (photos: BookSource[], index = 0): FillData => ({ brief: eff, dates, photos, index });
  const pages: BookPage[] = [];
  const st = template.structure;

  const cover = pool[0];
  const rest = template.hasCovers && pool.length > 1 ? pool.slice(1) : pool;

  if (template.hasCovers) {
    const coverTexts: Array<[TextRole, string]> =
      template.coverLayout === "cover-magazine"
        ? [["meta", [dates, brief.destinationName].filter(Boolean).join("  ·  ")], ["title", title], ["subtitle", brief.tagline || firstSentence(brief.description)], ["caption", brief.knownFor.slice(0, 3).join("  ·  ")]]
        : [["label", [brief.destinationName, dates].filter(Boolean).join("  ·  ")], ["title", title], ["subtitle", brief.tagline || firstSentence(brief.description)]];
    pages.push(pageWith("cover", theme, template.coverLayout, settings, cover ? [cover] : [], coverTexts, { section: "Cover" }));
  }
  if (st.title && template.hasCovers) {
    pages.push(pageWith("title", theme, "title-page", settings, [], [["label", brief.destinationName], ["title", title], ["subtitle", dates]], { section: "Front matter" }));
  }
  if (st.dedication) {
    pages.push(pageWith("dedication", theme, "dedication", settings, [], [["quote", "For everyone who was there."]], { section: "Front matter" }));
  }
  if (st.contents) {
    pages.push(pageWith("contents", theme, "contents", settings, [], [["label", brief.destinationName], ["heading", "Contents"], ["body", ""]], { section: "Front matter" }));
  }
  if (st.intro && (brief.description.trim() || st.title)) {
    pages.push(pageWith("intro", theme, "text-page", settings, [], [["label", brief.destinationName], ["heading", "Introduction"], ["body", brief.description.trim()]], { section: "Introduction" }));
  }

  // Content pages: take photos in order using the template's rhythm.
  let remaining = [...rest];
  let n = 0;
  let sinceChapter = 0;
  let chapter = 0;
  while (remaining.length > 0 && n < template.maxContentPages) {
    if (st.chapterEvery > 0 && sinceChapter >= st.chapterEvery) {
      chapter += 1;
      pages.push(pageWith("chapter", theme, "chapter", settings, [], [["label", `Chapter ${chapter + 1}`], ["title", uniqueLocations(remaining)[0] ?? "Next stop"], ["subtitle", ""]], { section: `Chapter ${chapter + 1}` }));
      sinceChapter = 0;
    }
    let key = template.rhythm[n % template.rhythm.length];
    let def = getLayout(key);
    // Layouts without photo slots (quote, text) are used as breathers and take no photos.
    if (def && def.imageSlots > remaining.length) {
      const fits = template.rhythm.map((k) => getLayout(k)).filter((l) => l && l.imageSlots >= 1 && l.imageSlots <= remaining.length);
      def = fits.sort((a, b) => b!.imageSlots - a!.imageSlots)[0] ?? getLayout("photo-caption");
      key = def!.key;
    }
    if (!def) break;
    const take = remaining.slice(0, def.imageSlots);
    remaining = remaining.slice(def.imageSlots);
    const kind: PageKind = key === "quote" ? "quote" : "content";
    pages.push(pageWith(kind, theme, key, settings, take, textsForLayout(key, data(take, n)), { section: chapter ? `Chapter ${chapter + 1}` : "Photos" }));
    n += 1;
    sinceChapter += 1;
  }

  if (st.quote && brief.tagline) {
    pages.push(pageWith("quote", theme, "quote", settings, [], textsForLayout("quote", data([])), { section: "Closing" }));
  }
  if (st.closing && template.hasCovers) {
    const last = pool[pool.length - 1];
    pages.push(pageWith("closing", theme, last ? "full-overlay" : "text-page", settings, last ? [last] : [], last ? [["heading", "Memories forever"], ["body", ""]] : [["heading", "Memories forever"]], { section: "Closing" }));
  }
  if (st.back && template.hasCovers) {
    pages.push(pageWith("back", theme, "back-cover", settings, [], [["quote", "Until the next adventure."], ["meta", title], ["meta", "Made with My Travel Memory"]], { section: "Cover" }));
  }

  // A book always has at least one page to start editing.
  if (pages.length === 0) pages.push(pageWith("content", theme, template.rhythm[0] ?? "photo-only", settings, [], [], { section: "Photos" }));

  const now = nowMs();
  const project: BookProject = {
    version: 1,
    id: newId("book"),
    tripId: options.tripId ?? brief.tripId,
    title,
    kind: options.kind ?? kindFor(template),
    templateKey: template.key,
    theme,
    settings,
    pages,
    needsFit: true,
    createdAt: now,
    updatedAt: now,
  };
  return syncFolios(refreshContents(project));
}

// -- derived page content ----------------------------------------------------------------------------

function pageTitle(page: BookPage): string {
  const el = page.elements.find((e): e is TextElement => e.type === "text" && (e.role === "title" || e.role === "heading") && e.text.trim() !== "");
  if (el) return el.text.trim().split("\n")[0];
  return { intro: "Introduction", quote: "A memory", closing: "Memories", chapter: "Chapter", content: "Photos" }[page.kind as string] ?? "Page";
}

const NOT_LISTED = new Set<PageKind>(["cover", "title", "dedication", "contents", "back", "blank"]);

/** Text for a contents page: page numbers and names, one per line. */
export function contentsText(project: Pick<BookProject, "pages">): string {
  const lines: string[] = [];
  let lastSection = "";
  project.pages.forEach((page, i) => {
    if (NOT_LISTED.has(page.kind)) return;
    // List each chapter or section once, plus intro and closing pages.
    const key = page.kind === "chapter" ? `chapter:${page.id}` : page.section || page.kind;
    if (page.kind === "content" && key === lastSection) return;
    lastSection = key;
    const label = page.kind === "content" ? page.section || "Photos" : pageTitle(page);
    lines.push(`${String(i + 1).padStart(2, "0")}    ${label}`);
  });
  return lines.join("\n");
}

/** Refreshes every contents page from the current page list. */
export function refreshContents(project: BookProject): BookProject {
  const text = contentsText(project);
  return {
    ...project,
    pages: project.pages.map((page) => {
      if (page.kind !== "contents") return page;
      return {
        ...page,
        elements: page.elements.map((e) => (e.type === "text" && e.role === "body" ? { ...e, text } : e)),
      };
    }),
  };
}

/** Page numbers: one small text on each inner page that follows the "show page numbers" setting. */
export function syncFolios(project: BookProject): BookProject {
  const { settings, theme } = project;
  const ctx = layoutCtx(theme, settings);
  const { k, kb } = scaleFor(settings.widthMm, settings.heightMm);
  const skip = new Set<PageKind>(["cover", "back", "blank"]);
  const pages = project.pages.map((page, i) => {
    const rest = page.elements.filter((e) => !(e.type === "text" && e.field === "pageNumber"));
    const want = settings.showFolios && !skip.has(page.kind) && !page.fullBleed;
    if (!want) return rest.length === page.elements.length ? page : { ...page, elements: rest };
    const existing = page.elements.find((e): e is TextElement => e.type === "text" && e.field === "pageNumber");
    const c = ctx.geom.content;
    const left = i % 2 === 1; // even page numbers sit on the left of a spread
    const frame = { x: left ? c.x : c.x + c.w - 14 * k, y: settings.heightMm - Math.max(settings.safeMm, settings.marginMm * 0.85) - 1, w: 14 * k, h: 5 * k };
    const style = { ...roleStyle("folio", theme, k, kb), align: left ? ("left" as const) : ("right" as const) };
    const el: TextElement = existing ? { ...existing, frame: existing.locked ? existing.frame : frame, style: { ...existing.style, align: style.align } } : makeText("folio", frame, "", style, { field: "pageNumber" });
    return { ...page, elements: [...rest, el] };
  });
  return { ...project, pages };
}

/** A few pages for the template gallery: cover, an inside spread, and a contents or closing page. */
export function previewPages(template: BookTemplate, brief: BookBrief): { project: BookProject; pages: BookPage[] } {
  const project = withDeterministicIds(() => buildBook(template, brief));
  const pick: BookPage[] = [];
  const cover = project.pages.find((p) => p.kind === "cover");
  if (cover) pick.push(cover);
  const inside = project.pages.filter((p) => p.kind === "content" || p.kind === "contents" || p.kind === "intro").slice(0, 3);
  pick.push(...inside);
  return { project, pages: pick.slice(0, 4) };
}


/** The book design that suits each memory template best. */
export function bookTemplateFor(memoryTemplate: string): string {
  switch (memoryTemplate) {
    case "horizon-poster":
      return "cinematic-story";
    case "field-journal":
      return "travel-diary";
    case "contact-sheet":
      return "travel-memories";
    case "day-by-day":
      return "yearly-memories";
    default:
      return "travel-memories";
  }
}
