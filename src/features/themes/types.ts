import type { ThemeFontKey } from "@/config/fonts";
import type { TemplateSlug } from "@/features/templates/types";

export type ImageTreatment = "mist" | "golden" | "cool-fog" | "earthy" | "alpine" | "none";

export type DecorationKey =
  | "tea-rows"
  | "mist-lines"
  | "waves"
  | "sun"
  | "palm"
  | "fog-bands"
  | "fern"
  | "falls"
  | "peaks"
  | "pines";

export interface ThemePalette {
  key: string;
  name: string;
  /** Page background */
  bg: string;
  /** Cards, paper and panels */
  surface: string;
  /** Primary text */
  ink: string;
  /** Secondary text; must keep >= 4.5:1 contrast against bg */
  muted: string;
  /** Headline / button colour */
  primary: string;
  /** Text on top of `primary` */
  onPrimary: string;
  /** Soft supporting tint */
  secondary: string;
  /** Small highlights: rules, dates, decorative strokes */
  accent: string;
  /** Hairlines and borders */
  line: string;
}

export interface ThemeTypography {
  heading: ThemeFontKey;
  body: ThemeFontKey;
  /** Optional handwritten font for collage captions */
  script?: ThemeFontKey;
  headingWeight: 400 | 500 | 600 | 700;
  headingCase: "normal" | "uppercase";
  headingTracking: "tight" | "normal" | "wide";
  headingStyle?: "normal" | "italic";
}

/** Key into src/config/generated/destination-images.json, e.g. "munnar/hero". */
export type ImageKey = string;

export interface ThemeCopy {
  /** Short line shown above titles, e.g. "Western Ghats · Kerala" */
  eyebrow: string;
  tagline: string;
  summary: string;
  /** Label used for the opening of a journal template */
  journalOpening: string;
  /** Text used when a memory has no photos yet */
  emptyState: string;
  /** Section label for the timeline template */
  timelineLabel: string;
  /** Sign-off line at the end of a memory */
  signOff: string;
}

export interface ThemeFacts {
  bestSeason: string;
  elevation?: string;
  knownFor: string[];
}

export interface DestinationTheme {
  slug: string;
  name: string;
  country: string;
  region?: string;
  copy: ThemeCopy;
  facts: ThemeFacts;
  /** First palette is the default */
  palettes: [ThemePalette, ...ThemePalette[]];
  typography: ThemeTypography;
  imageTreatment: ImageTreatment;
  decorations: DecorationKey[];
  radius: "square" | "soft" | "round";
  heroImage: ImageKey;
  galleryImages: ImageKey[];
  /** First template is the recommended one */
  templates: [TemplateSlug, ...TemplateSlug[]];
}

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  alt: string;
  blurDataURL?: string;
  source?: {
    title: string;
    author: string;
    license: string;
    licenseUrl: string | null;
    url: string;
  };
}
