import { getSampleMemory } from "@/features/memories/samples";
import type { EditorTrip } from "@/features/trips/types";

/** A clearly labelled, in-memory trip for development demo mode. */
export function demoTrip(): EditorTrip {
  const sample = getSampleMemory("sample-munnar");
  if (!sample) throw new Error("Sample memory missing");
  const c = sample.content;
  return {
    id: "demo",
    title: `${c.title} (demo)`,
    description: c.description,
    destinationSlug: c.destinationSlug,
    templateSlug: c.templateSlug,
    layout: c.layout,
    palette: c.palette,
    startDate: c.startDate,
    endDate: c.endDate,
    updatedAt: new Date(0).toISOString(),
    publication: null,
    photos: c.photos.map((p) => ({
      id: p.id,
      storagePath: "",
      url: p.src,
      width: p.width,
      height: p.height,
      caption: p.caption,
      location: p.location,
      takenOn: p.takenOn,
      frame: p.frame ?? {},
    })),
  };
}
