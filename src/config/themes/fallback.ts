import type { DestinationTheme } from "@/features/themes/types";

/**
 * Neutral theme used whenever a destination is unknown or incomplete. It has
 * no photography of its own, so templates fall back to the illustrated
 * placeholder.
 */
export const fallbackTheme: DestinationTheme = {
  slug: "anywhere",
  name: "Anywhere",
  country: "",
  copy: {
    eyebrow: "A travel memory",
    tagline: "Somewhere worth remembering.",
    summary: "A calm, neutral theme that suits any trip.",
    journalOpening: "Travel notes",
    emptyState: "Add a few photos and your memory will begin to take shape here.",
    timelineLabel: "Along the way",
    signOff: "Until the next trip.",
  },
  facts: { bestSeason: "Any time", knownFor: [] },
  palettes: [
    {
      key: "paper",
      name: "Paper",
      bg: "#f7f3ec",
      surface: "#fffdf9",
      ink: "#1e1b16",
      muted: "#5f574b",
      primary: "#1f3a2e",
      onPrimary: "#f7f3ec",
      secondary: "#ece5d8",
      accent: "#a94f2c",
      line: "#e2d9c9",
    },
  ],
  typography: {
    heading: "fraunces",
    body: "dm-sans",
    headingWeight: 500,
    headingCase: "normal",
    headingTracking: "tight",
  },
  imageTreatment: "none",
  decorations: ["mist-lines"],
  radius: "soft",
  heroImage: "",
  galleryImages: [],
  templates: ["field-journal", "horizon-poster", "contact-sheet", "day-by-day"],
};
