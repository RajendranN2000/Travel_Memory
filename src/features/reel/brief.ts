import type { EditorTrip } from "@/features/trips/types";
import { resolveTheme } from "@/features/themes/registry";
import type { ReelSource, ReelTripBrief } from "./types";

/** Builds what the reel editor needs from a memory: its text, theme and photo links. Server-safe and read-only. */
export function buildBrief(trip: EditorTrip): ReelTripBrief {
  const { theme, palette } = resolveTheme(trip.destinationSlug, trip.palette);
  const t = theme.typography;
  const sources: ReelSource[] = trip.photos.flatMap((p, i): ReelSource[] =>
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
            local: false,
            focusX: p.frame.x ?? 50,
            focusY: p.frame.y ?? 50,
          },
        ]
      : [],
  );
  return {
    tripId: trip.id,
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    sources,
    theme: {
      destinationName: theme.name,
      tagline: theme.copy.tagline,
      signOff: theme.copy.signOff,
      paletteName: palette.name,
      ink: palette.ink,
      primary: palette.primary,
      accent: palette.accent,
      paper: palette.bg,
      headingFont: t.heading,
      bodyFont: t.body,
      scriptFont: t.script ?? t.heading,
      headingWeight: t.headingWeight,
      headingItalic: t.headingStyle === "italic",
      headingUppercase: t.headingCase === "uppercase",
    },
  };
}
