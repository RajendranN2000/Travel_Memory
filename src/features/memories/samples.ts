import { getDestinationImage } from "@/features/themes/images";
import type { TemplateSlug } from "@/features/templates/types";
import type { MemoryContent, MemoryPhoto } from "./types";

/*
 * Sample memories demonstrate templates before a user has photos of their own.
 * They are always labelled as samples in the UI and use the licensed
 * destination photography from src/config/generated/destination-images.json.
 */

interface SampleSpec {
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  destinationSlug: string;
  templateSlug: TemplateSlug;
  layout: string;
  palette: string | null;
  photos: Array<{ key: string; caption: string; location: string; takenOn: string | null }>;
}

const specs: SampleSpec[] = [
  {
    slug: "sample-munnar",
    title: "Three slow days above the clouds",
    description:
      "We came for the tea and stayed for the mornings: cold air, warm cups and hills that appeared one ridge at a time as the mist burned off.",
    startDate: "2025-11-14",
    endDate: "2025-11-16",
    destinationSlug: "munnar",
    templateSlug: "field-journal",
    layout: "classic",
    palette: "tea-estate",
    photos: [
      { key: "munnar/hero", caption: "The first clear view after two hours of fog.", location: "Lockhart Gap", takenOn: "2025-11-14" },
      { key: "munnar/rows", caption: "Every row clipped to the same height, by hand.", location: "Kanan Devan Hills", takenOn: "2025-11-14" },
      { key: "munnar/valley", caption: "Granite peaks keeping watch over the estate.", location: "Near Eravikulam", takenOn: "2025-11-15" },
      { key: "munnar/road", caption: "The road we walked twice because we didn't want to leave.", location: "Rajamala", takenOn: "2025-11-16" },
    ],
  },
  {
    slug: "sample-goa",
    title: "Salt, sun and the slowest week of the year",
    description:
      "A week of doing very little, very well. Early swims, long lunches under a thatched roof and every evening on the sand watching the sky turn orange.",
    startDate: "2025-12-27",
    endDate: "2026-01-02",
    destinationSlug: "goa",
    templateSlug: "horizon-poster",
    layout: "full-bleed",
    palette: "sunset-shack",
    photos: [
      { key: "goa/hero", caption: "Low tide turned the whole beach into a mirror.", location: "Palolem", takenOn: "2025-12-27" },
      { key: "goa/shore", caption: "The view that made the climb to the fort worth it.", location: "Cabo de Rama", takenOn: "2025-12-29" },
      { key: "goa/cove", caption: "A tiny cove we only reached by boat.", location: "Butterfly Beach", takenOn: "2025-12-30" },
      { key: "goa/palms", caption: "Blue hour through the palms.", location: "Sinquerim", takenOn: "2025-12-31" },
      { key: "goa/boat", caption: "Fishing boats resting after the morning catch.", location: "Palolem", takenOn: "2026-01-02" },
    ],
  },
  {
    slug: "sample-ooty",
    title: "Up the ghat road in the fog",
    description:
      "Hairpin bends, wet pine forests and tea gardens that appeared and vanished in the clouds. We wore every sweater we packed.",
    startDate: "2025-08-08",
    endDate: "2025-08-10",
    destinationSlug: "ooty",
    templateSlug: "day-by-day",
    layout: "vertical",
    palette: "nilgiri-fog",
    photos: [
      { key: "ooty/fog-road", caption: "Somewhere between bend 28 and bend 29.", location: "Kotagiri road", takenOn: "2025-08-08" },
      { key: "ooty/hero", caption: "Clouds parting over the peak for a few minutes.", location: "Near Ooty", takenOn: "2025-08-09" },
      { key: "ooty/silver-oaks", caption: "Silver oaks standing in the tea like sentries.", location: "Nilgiris", takenOn: "2025-08-09" },
      { key: "ooty/garden", caption: "One last walk through the garden before the drive down.", location: "Ooty", takenOn: "2025-08-10" },
    ],
  },
  {
    slug: "sample-wayanad",
    title: "Waterfalls, pepper vines and muddy boots",
    description:
      "Four days of forest trails and homestay breakfasts. The rain never quite stopped, and the waterfalls were better for it.",
    startDate: "2025-10-02",
    endDate: "2025-10-05",
    destinationSlug: "wayanad",
    templateSlug: "contact-sheet",
    layout: "scrapbook",
    palette: "forest-floor",
    photos: [
      { key: "wayanad/hero", caption: "Banasura hiding in the clouds.", location: "Pulinjal", takenOn: "2025-10-02" },
      { key: "wayanad/falls", caption: "Soochippara, loud enough to feel.", location: "Soochippara", takenOn: "2025-10-03" },
      { key: "wayanad/heart-lake", caption: "The heart lake, at last!", location: "Chembra Peak", takenOn: "2025-10-04" },
      { key: "wayanad/paddy", caption: "Harvest gold on the way back.", location: "Kattikulam", takenOn: "2025-10-04" },
      { key: "wayanad/ghats", caption: "Storm rolling in over the ghats.", location: "Lakkidi viewpoint", takenOn: "2025-10-05" },
    ],
  },
  {
    slug: "sample-manali",
    title: "Snowlines and river songs",
    description:
      "A spring week in the Kullu valley: cold rivers, warm cafés and mountains that turned pink every evening.",
    startDate: "2026-04-11",
    endDate: "2026-04-16",
    destinationSlug: "manali",
    templateSlug: "horizon-poster",
    layout: "framed",
    palette: "alpine-morning",
    photos: [
      { key: "manali/hero", caption: "The valley opening up on the drive in.", location: "Kullu valley", takenOn: "2026-04-11" },
      { key: "manali/river", caption: "The Beas, cold enough to make you gasp.", location: "Manali", takenOn: "2026-04-12" },
      { key: "manali/bridge", caption: "Crossing over to the quieter side of town.", location: "Beas river", takenOn: "2026-04-13" },
      { key: "manali/alpenglow", caption: "Alpenglow from the guesthouse roof.", location: "Old Manali", takenOn: "2026-04-14" },
      { key: "manali/snow", caption: "A surprise snowfall on our last morning.", location: "Solang valley", takenOn: "2026-04-16" },
    ],
  },
];

function toContent(spec: SampleSpec): MemoryContent {
  const photos: MemoryPhoto[] = spec.photos.map((p, i) => {
    const img = getDestinationImage(p.key);
    return {
      id: `${spec.slug}-${i + 1}`,
      src: img?.src ?? null,
      width: img?.width ?? 1600,
      height: img?.height ?? 1067,
      caption: p.caption,
      location: p.location,
      takenOn: p.takenOn,
    };
  });
  return {
    title: spec.title,
    description: spec.description,
    startDate: spec.startDate,
    endDate: spec.endDate,
    destinationSlug: spec.destinationSlug,
    templateSlug: spec.templateSlug,
    layout: spec.layout,
    palette: spec.palette,
    photos,
  };
}

export interface SampleMemory {
  slug: string;
  content: MemoryContent;
}

export const sampleMemories: SampleMemory[] = specs.map((spec) => ({ slug: spec.slug, content: toContent(spec) }));

export function getSampleMemory(slug: string): SampleMemory | null {
  return sampleMemories.find((m) => m.slug === slug) ?? null;
}

export function getSampleForDestination(destinationSlug: string): SampleMemory | null {
  return sampleMemories.find((m) => m.content.destinationSlug === destinationSlug) ?? null;
}

/** Sample slugs are reserved so generated memory slugs never collide. */
export function isReservedSlug(slug: string): boolean {
  return slug.startsWith("sample-");
}
