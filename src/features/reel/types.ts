import type { ThemeFontKey } from "@/config/fonts";

export const ASPECTS = ["9:16", "4:5", "16:9", "1:1"] as const;
export type AspectKey = (typeof ASPECTS)[number];

export const RESOLUTIONS = ["720p", "1080p"] as const;
export type ResolutionKey = (typeof RESOLUTIONS)[number];

export const FPS_OPTIONS = [24, 30, 60] as const;
export type FpsOption = (typeof FPS_OPTIONS)[number];

export const MOTIONS = [
  "ken-burns",
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "pan-up",
  "pan-down",
  "push-in",
  "pull-out",
  "parallax",
  "none",
] as const;
export type MotionKey = (typeof MOTIONS)[number];

export const TRANSITIONS = ["dissolve", "fade", "slide-left", "slide-up", "zoom", "blur", "wipe", "none"] as const;
export type TransitionKey = (typeof TRANSITIONS)[number];

export const FILTERS = ["none", "cinematic", "warm", "cool", "vintage", "bw"] as const;
export type FilterKey = (typeof FILTERS)[number];

export type ClipFit = "cover" | "contain";

export interface ClipTransition {
  kind: TransitionKey;
  durationMs: number;
}

/** One photo on the timeline. The first clip's transition is never shown. */
export interface Clip {
  id: string;
  sourceId: string;
  durationMs: number;
  motion: MotionKey;
  /** Transition into this clip from the previous one */
  transition: ClipTransition;
  fit: ClipFit;
  /** Focus point, 0-100 from the left / top edge */
  focusX: number;
  focusY: number;
}

export const TEXT_KINDS = ["title", "subtitle", "location", "caption", "quote", "closing", "custom"] as const;
export type TextKind = (typeof TEXT_KINDS)[number];

export const TEXT_ANIMATIONS = ["fade", "rise", "zoom", "typewriter", "none"] as const;
export type TextAnimation = (typeof TEXT_ANIMATIONS)[number];

export type TextAlign = "left" | "center" | "right";

/**
 * How an overlay finds its place on the timeline:
 * - start: `offsetMs` after the video begins
 * - end: finishes `offsetMs` before the video ends
 * - clip: starts `offsetMs` after the given clip begins (follows it when reordered)
 * - free: absolute start in `offsetMs`
 */
export type TextAnchor = { type: "start" } | { type: "end" } | { type: "free" } | { type: "clip"; clipId: string };

export interface TextOverlay {
  id: string;
  kind: TextKind;
  text: string;
  anchor: TextAnchor;
  offsetMs: number;
  durationMs: number;
  font: ThemeFontKey;
  /** Font size as a percentage of the shorter side of the frame */
  sizePct: number;
  weight: 400 | 500 | 600 | 700;
  italic: boolean;
  uppercase: boolean;
  /** Letter spacing in em */
  tracking: number;
  color: string;
  align: TextAlign;
  /** Block centre as a fraction of the frame (0-1) */
  x: number;
  y: number;
  shadow: boolean;
  animation: TextAnimation;
}

export interface MusicSettings {
  /** File name of the imported track, or null when none is loaded */
  name: string | null;
  muted: boolean;
  /** 0-1 */
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  trimStartMs: number;
  /** null = play to the end of the file */
  trimEndMs: number | null;
  /** Repeat the track when it is shorter than the video */
  loop: boolean;
}

export interface FilterSettings {
  kind: FilterKey;
  /** 0-1 */
  intensity: number;
}

export interface LookSettings {
  filter: FilterSettings;
  /** 0-1 */
  grain: number;
  /** 0-1 */
  vignette: number;
  motionBlur: boolean;
}

export interface ReelProject {
  version: 1;
  presetKey: string;
  title: string;
  aspect: AspectKey;
  resolution: ResolutionKey;
  fps: FpsOption;
  clips: Clip[];
  overlays: TextOverlay[];
  look: LookSettings;
  /** Multiplier for zoom / pan distance, 0.3-2 */
  motionIntensity: number;
  /** Default length of new transitions */
  transitionMs: number;
  music: MusicSettings;
}

/** Theme details carried over from the memory the reel is made from. */
export interface ReelTheme {
  destinationName: string;
  tagline: string;
  signOff: string;
  paletteName: string;
  /** #rrggbb */
  ink: string;
  primary: string;
  accent: string;
  paper: string;
  headingFont: ThemeFontKey;
  bodyFont: ThemeFontKey;
  scriptFont: ThemeFontKey;
  headingWeight: 400 | 500 | 600 | 700;
  headingItalic: boolean;
  headingUppercase: boolean;
}

/** A photo the reel can use. `url` is a remote or object URL; `blob` is set for local files. */
export interface ReelSource {
  id: string;
  name: string;
  url: string | null;
  width: number;
  height: number;
  caption: string;
  location: string;
  /** Imported from this device rather than from the memory */
  local: boolean;
  focusX: number;
  focusY: number;
}

export interface ReelTripBrief {
  tripId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  theme: ReelTheme;
  sources: ReelSource[];
}

/** Laid-out clip with absolute times in milliseconds. */
export interface ClipSlot {
  clip: Clip;
  index: number;
  startMs: number;
  endMs: number;
  /** Effective overlap with the previous clip */
  transitionInMs: number;
}

export interface ResolvedOverlay {
  overlay: TextOverlay;
  startMs: number;
  endMs: number;
}
