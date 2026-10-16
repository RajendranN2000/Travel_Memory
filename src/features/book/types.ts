import type { FormatKey, Rect } from "./units";

export type FontFamilyKey =
  | "playfair-display"
  | "cormorant-garamond"
  | "dm-sans"
  | "dm-serif-display"
  | "lora"
  | "caveat"
  | "outfit"
  | "fraunces"
  | "josefin-sans"
  | "source-sans-3";

export type TextAlign = "left" | "center" | "right" | "justify";

export interface TextStyle {
  font: FontFamilyKey;
  /** Points */
  sizePt: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: TextAlign;
  /** Multiple of the font size */
  lineHeight: number;
  /** Extra space after each glyph, in points */
  trackingPt: number;
  /** Space between paragraphs, in points */
  paraSpacingPt: number;
  uppercase: boolean;
}

export type TextRole = "title" | "subtitle" | "caption" | "body" | "quote" | "heading" | "label" | "meta" | "folio" | "custom";

export type TextField = "pageNumber" | "none";

export interface TextElement {
  id: string;
  type: "text";
  role: TextRole;
  frame: Rect;
  text: string;
  style: TextStyle;
  /** Text flows through this many columns */
  columns: number;
  columnGapMm: number;
  /** Inner padding in mm */
  paddingMm: number;
  /** Vertical placement of the text block inside its frame */
  valign: "top" | "middle" | "bottom";
  field: TextField;
  background?: string;
  opacity: number;
  locked?: boolean;
}

export type FitMode = "contain" | "fill" | "original" | "full-page" | "custom";

export interface ImageFilter {
  preset: "none" | "bw" | "sepia" | "warm" | "cool" | "vivid" | "fade";
  /** -1..1 */
  brightness: number;
  /** -1..1 */
  contrast: number;
  /** -1..1 */
  saturation: number;
}

export interface ImageElement {
  id: string;
  type: "image";
  /** Null while the frame is a placeholder waiting for a photo */
  sourceId: string | null;
  frame: Rect;
  mode: FitMode;
  /** fill: focus point (0-1) and zoom (>= 1) */
  focusX: number;
  focusY: number;
  zoom: number;
  /** custom: crop rectangle as fractions of the source (0-1) */
  crop: Rect | null;
  /** full-page: let the photo cover the whole frame, cropping the overflow */
  coverPage: boolean;
  /** The photo extends to the bleed edge (only meaningful for full-page frames) */
  fullBleed: boolean;
  borderMm: number;
  borderColor: string;
  radiusMm: number;
  shadow: boolean;
  opacity: number;
  filter: ImageFilter;
  background?: string;
  alt: string;
  /** The area the layout gave this photo. A whole-photo frame hugs the picture inside it. */
  slot?: Rect;
  locked?: boolean;
}

export type ShapeKind = "rect" | "ellipse" | "line";

export interface ShapeElement {
  id: string;
  type: "shape";
  shape: ShapeKind;
  frame: Rect;
  fill: string | null;
  stroke: string | null;
  strokeMm: number;
  radiusMm: number;
  opacity: number;
  locked?: boolean;
}

export type BookElement = TextElement | ImageElement | ShapeElement;

export type PageKind = "cover" | "title" | "dedication" | "contents" | "intro" | "chapter" | "content" | "quote" | "closing" | "back" | "blank";

export interface PageBackground {
  color: string;
  /** A photo behind everything, shown full-page */
  imageId: string | null;
  /** Texture or pattern drawn above the colour */
  pattern: "none" | "dots" | "lines" | "frame";
}

export interface BookPage {
  id: string;
  kind: PageKind;
  layoutKey: string | null;
  section: string;
  background: PageBackground;
  elements: BookElement[];
  /** Content that did not fit the last layout change and is waiting to be placed */
  unplaced: BookElement[];
  /** Images may reach the bleed edge on this page */
  fullBleed: boolean;
}

export interface BookTheme {
  key: string;
  name: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  headingFont: FontFamilyKey;
  bodyFont: FontFamilyKey;
  scriptFont: FontFamilyKey;
  /** Used for small, tracked, upper-case labels */
  labelFont: FontFamilyKey;
  headingBold: boolean;
  headingItalic: boolean;
}

export type BookKind = "photobook" | "magazine" | "print";

export interface BookSettings {
  format: FormatKey;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  marginMm: number;
  /** Text and faces should stay at least this far from the trim edge */
  safeMm: number;
  cropMarks: boolean;
  /** Paper thickness for the cover spine, in mm per page */
  paperMm: number;
  showFolios: boolean;
}

export interface BookProject {
  version: 1;
  id: string;
  tripId: string;
  title: string;
  kind: BookKind;
  templateKey: string;
  theme: BookTheme;
  settings: BookSettings;
  pages: BookPage[];
  /** A freshly built book whose text still needs to be fitted to its boxes once fonts are loaded */
  needsFit?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** A photo the book can use. */
export interface BookSource {
  id: string;
  name: string;
  /** Remote URL, or an object URL for local files */
  url: string | null;
  width: number;
  height: number;
  caption: string;
  location: string;
  takenOn: string | null;
  local: boolean;
}

export interface BookBrief {
  tripId: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  destinationName: string;
  region: string;
  country: string;
  tagline: string;
  bestSeason: string;
  knownFor: string[];
  elevation: string;
  theme: {
    paper: string;
    ink: string;
    muted: string;
    primary: string;
    accent: string;
    secondary: string;
  };
  sources: BookSource[];
}
