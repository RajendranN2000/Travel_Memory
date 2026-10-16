import { formatDateRange } from "@/lib/dates";
import { LIMITS } from "./config";
import { getPreset, titleFontKey, DEFAULT_PRESET_KEY, type ReelPreset } from "./presets";
import { newId } from "./timeline";
import type { AspectKey, Clip, FpsOption, MusicSettings, ReelProject, ReelSource, ReelTripBrief, ResolutionKey, TextOverlay } from "./types";

export const DEFAULT_MUSIC: MusicSettings = {
  name: null,
  muted: false,
  volume: 0.8,
  fadeInMs: 1000,
  fadeOutMs: 2000,
  trimStartMs: 0,
  trimEndMs: null,
  loop: true,
};

const WHITE = "#ffffff";

export function baseOverlay(partial: Partial<TextOverlay> & Pick<TextOverlay, "kind" | "text">): TextOverlay {
  return {
    id: newId("text"),
    anchor: { type: "free" },
    offsetMs: 0,
    durationMs: 2500,
    font: "dm-sans",
    sizePct: 4,
    weight: 600,
    italic: false,
    uppercase: false,
    tracking: 0,
    color: WHITE,
    align: "center",
    x: 0.5,
    y: 0.5,
    shadow: true,
    animation: "fade",
    ...partial,
  };
}

export function makeClip(source: ReelSource, preset: ReelPreset, index: number): Clip {
  const alt = preset.alternateTransitions;
  const kind = alt && alt.length ? alt[(index - 1 + alt.length) % alt.length] : preset.transition.kind;
  return {
    id: newId("clip"),
    sourceId: source.id,
    durationMs: preset.clipMs,
    motion: preset.motions[index % preset.motions.length],
    transition: { kind, durationMs: preset.transition.durationMs },
    fit: "cover",
    focusX: source.focusX,
    focusY: source.focusY,
  };
}

function clipOverlays(clip: Clip, source: ReelSource, preset: ReelPreset, fonts: ReelTripBrief["theme"]): TextOverlay[] {
  const out: TextOverlay[] = [];
  const duration = Math.max(1200, clip.durationMs - 1100);
  const location = source.location.trim();
  const caption = source.caption.trim();
  if (location) {
    out.push(
      baseOverlay({
        kind: "location",
        text: location,
        anchor: { type: "clip", clipId: clip.id },
        offsetMs: 600,
        durationMs: duration,
        font: fonts.bodyFont,
        sizePct: 3,
        weight: 600,
        uppercase: true,
        tracking: 0.18,
        y: caption ? 0.7 : 0.74,
        animation: "rise",
      }),
    );
  }
  if (caption) {
    out.push(
      baseOverlay({
        kind: "caption",
        text: caption,
        anchor: { type: "clip", clipId: clip.id },
        offsetMs: 800,
        durationMs: Math.max(1200, duration - 200),
        font: titleFontKey(preset, { heading: fonts.headingFont, body: fonts.bodyFont, script: fonts.scriptFont }),
        sizePct: 4,
        weight: 500,
        y: 0.76,
        animation: "fade",
      }),
    );
  }
  return out;
}

export interface BuildOptions {
  presetKey?: string;
  /** Which photos to include, in order. Defaults to every photo from the memory. */
  sourceIds?: string[];
  aspect?: AspectKey;
  resolution?: ResolutionKey;
  fps?: FpsOption;
  music?: MusicSettings;
}

/** A complete, polished draft from the memory's photos and theme. */
export function buildProject(brief: ReelTripBrief, options: BuildOptions = {}): ReelProject {
  const preset = getPreset(options.presetKey ?? DEFAULT_PRESET_KEY);
  const byId = new Map(brief.sources.map((s) => [s.id, s]));
  const chosen = (options.sourceIds ?? brief.sources.filter((s) => !s.local).map((s) => s.id))
    .map((id) => byId.get(id))
    .filter((s): s is ReelSource => Boolean(s))
    .slice(0, LIMITS.maxClips);

  const clips = chosen.map((source, i) => makeClip(source, preset, i));
  const theme = brief.theme;
  const titleFont = titleFontKey(preset, { heading: theme.headingFont, body: theme.bodyFont, script: theme.scriptFont });
  const dates = formatDateRange(brief.startDate, brief.endDate);
  const subtitle = [theme.destinationName, dates].filter(Boolean).join("  ·  ");

  const overlays: TextOverlay[] = [];
  if (clips.length) {
    const first = clips[0];
    overlays.push(
      baseOverlay({
        kind: "title",
        text: brief.title.trim() || theme.destinationName,
        anchor: { type: "start" },
        offsetMs: 300,
        durationMs: Math.min(3200, first.durationMs + 400),
        font: titleFont,
        sizePct: 9,
        weight: theme.headingWeight,
        italic: theme.headingItalic && preset.titleFont === "heading",
        uppercase: preset.titleUppercase,
        tracking: preset.titleUppercase ? 0.08 : 0,
        y: 0.42,
        animation: preset.titleAnimation,
      }),
    );
    if (subtitle) {
      overlays.push(
        baseOverlay({
          kind: "subtitle",
          text: subtitle,
          anchor: { type: "start" },
          offsetMs: 800,
          durationMs: Math.min(2700, first.durationMs),
          font: theme.bodyFont,
          sizePct: 3.2,
          weight: 500,
          uppercase: true,
          tracking: 0.2,
          y: 0.5,
          animation: "fade",
        }),
      );
    }
    for (const clip of clips) {
      const source = byId.get(clip.sourceId);
      if (source) overlays.push(...clipOverlays(clip, source, preset, theme));
    }
    overlays.push(
      baseOverlay({
        kind: "closing",
        text: "Memories Forever",
        anchor: { type: "end" },
        offsetMs: 300,
        durationMs: 2600,
        font: titleFont,
        sizePct: 8,
        weight: theme.headingWeight,
        italic: theme.headingItalic && preset.titleFont === "heading",
        uppercase: preset.titleUppercase,
        tracking: preset.titleUppercase ? 0.08 : 0,
        y: 0.46,
        animation: preset.titleAnimation === "zoom" ? "zoom" : "rise",
      }),
    );
  }

  return {
    version: 1,
    presetKey: preset.key,
    title: brief.title.trim() || theme.destinationName,
    aspect: options.aspect ?? "9:16",
    resolution: options.resolution ?? "1080p",
    fps: options.fps ?? 30,
    clips,
    overlays,
    look: {
      filter: { kind: preset.filter, intensity: preset.filterIntensity },
      grain: preset.grain,
      vignette: preset.vignette,
      motionBlur: preset.motionBlur,
    },
    motionIntensity: preset.motionIntensity,
    transitionMs: preset.transition.durationMs,
    music: options.music ?? { ...DEFAULT_MUSIC },
  };
}

/** Keeps only clips whose photos still exist, e.g. after a saved draft is reopened. */
export function reconcileProject(project: ReelProject, sources: readonly ReelSource[]): { project: ReelProject; dropped: number } {
  const known = new Set(sources.map((s) => s.id));
  const clips = project.clips.filter((c) => known.has(c.sourceId));
  const alive = new Set(clips.map((c) => c.id));
  const overlays = project.overlays.filter((o) => o.anchor.type !== "clip" || alive.has(o.anchor.clipId));
  return { project: { ...project, clips, overlays }, dropped: project.clips.length - clips.length };
}

/** Light validation for projects read back from storage. */
export function isReelProject(value: unknown): value is ReelProject {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<ReelProject>;
  return p.version === 1 && Array.isArray(p.clips) && Array.isArray(p.overlays) && typeof p.aspect === "string" && Boolean(p.look) && Boolean(p.music);
}
