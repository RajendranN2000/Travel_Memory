import { getSampleMemory } from "@/features/memories/samples";
import type { MemoryContent } from "@/features/memories/types";
import { resolveTheme } from "@/features/themes/registry";
import type { EditorTrip } from "@/features/trips/types";
import type { BookBrief, BookSource } from "./types";

function themeParts(destinationSlug: string, palette: string | null) {
  const { theme, palette: p } = resolveTheme(destinationSlug, palette);
  return {
    destinationName: theme.name,
    region: theme.region ?? "",
    country: theme.country,
    tagline: theme.copy.tagline,
    bestSeason: theme.facts.bestSeason,
    knownFor: theme.facts.knownFor,
    elevation: theme.facts.elevation ?? "",
    colors: { paper: p.bg, ink: p.ink, muted: p.muted, primary: p.primary, accent: p.accent, secondary: p.secondary },
  };
}

/** Everything the book designer needs from a memory. Server-safe and read-only. */
export function buildBookBrief(trip: EditorTrip): BookBrief {
  const t = themeParts(trip.destinationSlug, trip.palette);
  const sources: BookSource[] = trip.photos.flatMap((p, i): BookSource[] =>
    p.url
      ? [
          {
            id: p.id,
            name: p.caption.trim() || p.location.trim() || `Photo ${i + 1}`,
            url: p.url,
            width: p.width,
            height: p.height,
            caption: p.caption.trim(),
            location: p.location.trim(),
            takenOn: p.takenOn,
            local: false,
          },
        ]
      : [],
  );
  return {
    tripId: trip.id,
    title: trip.title,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    destinationName: t.destinationName,
    region: t.region,
    country: t.country,
    tagline: t.tagline,
    bestSeason: t.bestSeason,
    knownFor: t.knownFor,
    elevation: t.elevation,
    theme: t.colors,
    sources,
  };
}

/** A blank brief for starting a book from scratch, with no memory behind it. */
export function scratchBrief(): BookBrief {
  const t = themeParts("munnar", null);
  return {
    tripId: "scratch",
    title: "My travel book",
    description: "",
    startDate: null,
    endDate: null,
    destinationName: "",
    region: "",
    country: "",
    tagline: "",
    bestSeason: "",
    knownFor: [],
    elevation: "",
    theme: { paper: "#faf7f2", ink: "#1c1917", muted: "#78716c", primary: "#1f3a2e", accent: "#a94f2c", secondary: t.colors.secondary },
    sources: [],
  };
}

function fromMemory(content: MemoryContent, id: string): BookBrief {
  const t = themeParts(content.destinationSlug, content.palette);
  const sources: BookSource[] = content.photos.flatMap((p): BookSource[] =>
    p.src
      ? [{ id: `${id}:${p.id}`, name: p.caption || p.location, url: p.src, width: p.width, height: p.height, caption: p.caption, location: p.location, takenOn: p.takenOn, local: false }]
      : [],
  );
  return {
    tripId: id,
    title: content.title,
    description: content.description,
    startDate: content.startDate,
    endDate: content.endDate,
    destinationName: t.destinationName,
    region: t.region,
    country: t.country,
    tagline: t.tagline,
    bestSeason: t.bestSeason,
    knownFor: t.knownFor,
    elevation: t.elevation,
    theme: t.colors,
    sources,
  };
}

/** The licensed sample photography, used to show what each template looks like. */
export function sampleBookBrief(slug = "sample-munnar"): BookBrief {
  const sample = getSampleMemory(slug) ?? getSampleMemory("sample-munnar");
  if (!sample) return scratchBrief();
  return fromMemory(sample.content, `sample:${slug}`);
}
