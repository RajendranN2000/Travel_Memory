import type { ThemeFontKey } from "@/config/fonts";
import type { FilterKey, MotionKey, TextAnimation, TransitionKey } from "./types";

export interface ReelPreset {
  key: string;
  name: string;
  description: string;
  /** Motions are handed out to clips in order, repeating */
  motions: MotionKey[];
  clipMs: number;
  transition: { kind: TransitionKey; durationMs: number };
  /** Cycled between clips for variety; the first is used by default */
  alternateTransitions?: TransitionKey[];
  filter: FilterKey;
  filterIntensity: number;
  grain: number;
  vignette: number;
  motionIntensity: number;
  motionBlur: boolean;
  /** Which theme font the titles use */
  titleFont: "heading" | "body" | "script";
  titleAnimation: TextAnimation;
  titleUppercase: boolean;
  /** Gradient used for the preset thumbnail */
  swatch: [string, string];
}

export const PRESETS: ReelPreset[] = [
  {
    key: "cinematic-travel",
    name: "Cinematic Travel",
    description: "Slow push-ins, soft dissolves and a warm film grade.",
    motions: ["push-in", "ken-burns", "pan-right", "zoom-in", "pan-left", "pull-out"],
    clipMs: 3600,
    transition: { kind: "dissolve", durationMs: 900 },
    filter: "cinematic",
    filterIntensity: 0.7,
    grain: 0.25,
    vignette: 0.45,
    motionIntensity: 1,
    motionBlur: false,
    titleFont: "heading",
    titleAnimation: "rise",
    titleUppercase: false,
    swatch: ["#2b2118", "#c98a4b"],
  },
  {
    key: "adventure",
    name: "Adventure",
    description: "Quick cuts, bold slides and energetic movement.",
    motions: ["zoom-in", "pan-right", "pull-out", "pan-up", "ken-burns", "pan-left"],
    clipMs: 2400,
    transition: { kind: "slide-left", durationMs: 450 },
    alternateTransitions: ["slide-left", "zoom", "wipe", "slide-up"],
    filter: "warm",
    filterIntensity: 0.45,
    grain: 0.12,
    vignette: 0.3,
    motionIntensity: 1.35,
    motionBlur: true,
    titleFont: "body",
    titleAnimation: "zoom",
    titleUppercase: true,
    swatch: ["#13324a", "#f2a03d"],
  },
  {
    key: "dreamy-memories",
    name: "Dreamy Memories",
    description: "Gentle drifts and blurred, glowing transitions.",
    motions: ["zoom-in", "pan-up", "zoom-out", "pan-down"],
    clipMs: 4200,
    transition: { kind: "blur", durationMs: 1100 },
    filter: "warm",
    filterIntensity: 0.35,
    grain: 0.08,
    vignette: 0.35,
    motionIntensity: 0.75,
    motionBlur: false,
    titleFont: "script",
    titleAnimation: "fade",
    titleUppercase: false,
    swatch: ["#6b4a6e", "#f3c6c0"],
  },
  {
    key: "minimal",
    name: "Minimal",
    description: "Clean fades and almost still photographs.",
    motions: ["zoom-in", "none", "zoom-out", "none"],
    clipMs: 3000,
    transition: { kind: "fade", durationMs: 700 },
    filter: "none",
    filterIntensity: 0,
    grain: 0,
    vignette: 0.1,
    motionIntensity: 0.5,
    motionBlur: false,
    titleFont: "body",
    titleAnimation: "fade",
    titleUppercase: true,
    swatch: ["#ece9e3", "#8c877d"],
  },
  {
    key: "vintage-film",
    name: "Vintage Film",
    description: "Faded colour, heavy grain and a soft vignette.",
    motions: ["ken-burns", "zoom-in", "pan-left", "zoom-out"],
    clipMs: 3300,
    transition: { kind: "dissolve", durationMs: 700 },
    filter: "vintage",
    filterIntensity: 0.85,
    grain: 0.6,
    vignette: 0.6,
    motionIntensity: 0.8,
    motionBlur: false,
    titleFont: "heading",
    titleAnimation: "fade",
    titleUppercase: false,
    swatch: ["#5a4632", "#d9b77e"],
  },
  {
    key: "nature-escape",
    name: "Nature Escape",
    description: "Wide pans and calm parallax through greenery and sky.",
    motions: ["pan-right", "parallax", "pan-left", "pull-out", "zoom-in"],
    clipMs: 3800,
    transition: { kind: "wipe", durationMs: 800 },
    alternateTransitions: ["dissolve", "wipe", "dissolve", "slide-up"],
    filter: "cool",
    filterIntensity: 0.3,
    grain: 0.1,
    vignette: 0.3,
    motionIntensity: 1,
    motionBlur: false,
    titleFont: "heading",
    titleAnimation: "rise",
    titleUppercase: false,
    swatch: ["#17372a", "#9cc58a"],
  },
];

export const DEFAULT_PRESET_KEY = "cinematic-travel";

export function getPreset(key: string): ReelPreset {
  return PRESETS.find((p) => p.key === key) ?? PRESETS[0];
}

export function titleFontKey(preset: ReelPreset, fonts: { heading: ThemeFontKey; body: ThemeFontKey; script: ThemeFontKey }): ThemeFontKey {
  return fonts[preset.titleFont];
}

export const MOTION_LABELS: Record<MotionKey, string> = {
  "ken-burns": "Ken Burns",
  "zoom-in": "Slow zoom in",
  "zoom-out": "Slow zoom out",
  "pan-left": "Pan left",
  "pan-right": "Pan right",
  "pan-up": "Pan up",
  "pan-down": "Pan down",
  "push-in": "Cinematic push-in",
  "pull-out": "Cinematic pull-out",
  parallax: "Parallax depth",
  none: "Still",
};

export const TRANSITION_LABELS: Record<TransitionKey, string> = {
  dissolve: "Dissolve",
  fade: "Fade through black",
  "slide-left": "Slide",
  "slide-up": "Slide up",
  zoom: "Zoom",
  blur: "Blur",
  wipe: "Wipe",
  none: "Cut",
};

export const FILTER_LABELS: Record<FilterKey, string> = {
  none: "Original",
  cinematic: "Cinematic",
  warm: "Warm",
  cool: "Cool",
  vintage: "Vintage",
  bw: "Black & white",
};
