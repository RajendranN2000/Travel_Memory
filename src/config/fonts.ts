import {
  Caveat,
  Cormorant_Garamond,
  DM_Sans,
  DM_Serif_Display,
  Fraunces,
  Josefin_Sans,
  Karla,
  Nunito_Sans,
  Outfit,
  Playfair_Display,
  Source_Sans_3,
  Work_Sans,
  Young_Serif,
} from "next/font/google";

/*
 * App chrome fonts are preloaded. Destination fonts are declared with
 * `preload: false`: their @font-face rules are always available, but a browser
 * only downloads a file once text actually renders in that family.
 */

const appDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-app-display",
  style: ["normal", "italic"],
  display: "swap",
});
const appBody = DM_Sans({ subsets: ["latin"], variable: "--font-app-body", display: "swap" });

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  preload: false,
  display: "swap",
});
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito-sans", preload: false, display: "swap" });
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  preload: false,
  display: "swap",
});
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", preload: false, display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  preload: false,
  display: "swap",
});
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", preload: false, display: "swap" });
const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-young-serif",
  preload: false,
  display: "swap",
});
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", preload: false, display: "swap" });
const josefin = Josefin_Sans({ subsets: ["latin"], variable: "--font-josefin", preload: false, display: "swap" });
const karla = Karla({ subsets: ["latin"], variable: "--font-karla", preload: false, display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", preload: false, display: "swap" });

export const fontVariables = [
  appDisplay,
  appBody,
  cormorant,
  nunitoSans,
  dmSerif,
  outfit,
  playfair,
  sourceSans,
  youngSerif,
  workSans,
  josefin,
  karla,
  caveat,
]
  .map((font) => font.variable)
  .join(" ");

/** Font keys that destination themes may reference. */
export const themeFonts = {
  fraunces: "var(--font-app-display)",
  "dm-sans": "var(--font-app-body)",
  cormorant: "var(--font-cormorant)",
  "nunito-sans": "var(--font-nunito-sans)",
  "dm-serif": "var(--font-dm-serif)",
  outfit: "var(--font-outfit)",
  playfair: "var(--font-playfair)",
  "source-sans": "var(--font-source-sans)",
  "young-serif": "var(--font-young-serif)",
  "work-sans": "var(--font-work-sans)",
  josefin: "var(--font-josefin)",
  karla: "var(--font-karla)",
  caveat: "var(--font-caveat)",
} as const;

export type ThemeFontKey = keyof typeof themeFonts;
