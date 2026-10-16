import { clamp, LIMITS } from "./config";
import type { Clip, ClipSlot, ReelProject, ResolvedOverlay, TextOverlay } from "./types";

let counter = 0;
/** Short unique id for clips and overlays. */
export function newId(prefix: string): string {
  counter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}${counter.toString(36)}`;
}

/**
 * Clips play one after another; a transition overlaps the end of the previous
 * clip with the start of the next. The overlap can never exceed half of either
 * neighbour so every clip keeps some time on its own.
 */
export function effectiveTransition(prev: Clip | undefined, clip: Clip): number {
  if (!prev || clip.transition.kind === "none") return 0;
  const cap = Math.floor(Math.min(prev.durationMs, clip.durationMs) / 2);
  return clamp(Math.round(clip.transition.durationMs), 0, cap);
}

export function layoutClips(clips: readonly Clip[]): ClipSlot[] {
  const slots: ClipSlot[] = [];
  let cursor = 0;
  clips.forEach((clip, index) => {
    const overlap = effectiveTransition(clips[index - 1], clip);
    const startMs = Math.max(0, cursor - overlap);
    const endMs = startMs + clip.durationMs;
    slots.push({ clip, index, startMs, endMs, transitionInMs: overlap });
    cursor = endMs;
  });
  return slots;
}

export function totalDuration(clips: readonly Clip[]): number {
  const slots = layoutClips(clips);
  return slots.length ? slots[slots.length - 1].endMs : 0;
}

/** Clips visible at time `t`: one normally, two while a transition is running. */
export function slotsAt(slots: readonly ClipSlot[], t: number): ClipSlot[] {
  const hit = slots.filter((s) => t >= s.startMs && t < s.endMs);
  if (hit.length) return hit;
  // Exactly at (or past) the end: hold the final frame.
  return slots.length ? [slots[slots.length - 1]] : [];
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(clamp(to, 0, next.length), 0, item);
  return next;
}

export function reorderClips(clips: readonly Clip[], from: number, to: number): Clip[] {
  return moveItem(clips, from, to);
}

export function duplicateClip(clips: readonly Clip[], clipId: string): { clips: Clip[]; newId: string | null } {
  const index = clips.findIndex((c) => c.id === clipId);
  if (index < 0 || clips.length >= LIMITS.maxClips) return { clips: [...clips], newId: null };
  const copy: Clip = { ...clips[index], id: newId("clip"), transition: { ...clips[index].transition } };
  const next = [...clips];
  next.splice(index + 1, 0, copy);
  return { clips: next, newId: copy.id };
}

export function removeClip(clips: readonly Clip[], clipId: string): Clip[] {
  return clips.filter((c) => c.id !== clipId);
}

export function setClipDuration(clips: readonly Clip[], clipId: string, durationMs: number): Clip[] {
  const value = clamp(Math.round(durationMs), LIMITS.minClipMs, LIMITS.maxClipMs);
  return clips.map((c) => (c.id === clipId ? { ...c, durationMs: value } : c));
}

export function patchClip(clips: readonly Clip[], clipId: string, patch: Partial<Omit<Clip, "id">>): Clip[] {
  return clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c));
}

/** Time position of an overlay, resolved against the current clips. */
export function resolveOverlay(overlay: TextOverlay, slots: readonly ClipSlot[], totalMs: number): ResolvedOverlay | null {
  const { anchor } = overlay;
  let startMs: number;
  if (anchor.type === "start") startMs = overlay.offsetMs;
  else if (anchor.type === "free") startMs = overlay.offsetMs;
  else if (anchor.type === "end") startMs = totalMs - overlay.durationMs - overlay.offsetMs;
  else {
    const slot = slots.find((s) => s.clip.id === anchor.clipId);
    if (!slot) return null;
    startMs = slot.startMs + overlay.offsetMs;
  }
  startMs = Math.max(0, startMs);
  const endMs = Math.min(totalMs, startMs + overlay.durationMs);
  if (endMs <= startMs) return null;
  return { overlay, startMs, endMs };
}

export function resolveOverlays(project: Pick<ReelProject, "clips" | "overlays">): ResolvedOverlay[] {
  const slots = layoutClips(project.clips);
  const total = slots.length ? slots[slots.length - 1].endMs : 0;
  return project.overlays.flatMap((o) => resolveOverlay(o, slots, total) ?? []);
}

/**
 * Moves an overlay to a new absolute start time, re-anchoring it so that the
 * position the user dragged to is the one that is kept.
 */
export function placeOverlay(overlay: TextOverlay, startMs: number, durationMs: number, slots: readonly ClipSlot[], totalMs: number): TextOverlay {
  const start = clamp(Math.round(startMs), 0, Math.max(0, totalMs - LIMITS.minTextMs));
  const duration = clamp(Math.round(durationMs), LIMITS.minTextMs, Math.max(LIMITS.minTextMs, totalMs - start));
  if (overlay.anchor.type === "clip") {
    const slot = slots.find((s) => s.clip.id === (overlay.anchor as { clipId: string }).clipId);
    if (slot) return { ...overlay, offsetMs: start - slot.startMs, durationMs: duration };
  }
  if (overlay.anchor.type === "end") return { ...overlay, offsetMs: Math.max(0, totalMs - start - duration), durationMs: duration };
  return { ...overlay, anchor: { type: "free" }, offsetMs: start, durationMs: duration };
}

/** Overlays that belong to a removed clip are dropped with it. */
export function dropOverlaysOfClip(overlays: readonly TextOverlay[], clipId: string): TextOverlay[] {
  return overlays.filter((o) => !(o.anchor.type === "clip" && o.anchor.clipId === clipId));
}

/**
 * Rounds each clip to a whole number of beats so cuts land on the music.
 * `beatMs` is the beat interval; clips are never shorter than `minBeats` beats.
 */
export function snapClipsToBeat(clips: readonly Clip[], beatMs: number, minBeats = 2): Clip[] {
  if (!(beatMs > 0)) return [...clips];
  return clips.map((c) => {
    const beats = Math.max(minBeats, Math.round(c.durationMs / beatMs));
    return { ...c, durationMs: clamp(Math.round(beats * beatMs), LIMITS.minClipMs, LIMITS.maxClipMs) };
  });
}

/** Evenly spaced beat positions covering `totalMs`. */
export function beatGrid(beatMs: number, offsetMs: number, totalMs: number): number[] {
  if (!(beatMs > 0)) return [];
  const out: number[] = [];
  for (let t = offsetMs; t <= totalMs; t += beatMs) out.push(Math.round(t));
  return out;
}

/** Number of clips to keep selected photos in order of first use (for the media panel). */
export function usageBySource(clips: readonly Clip[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of clips) map.set(c.sourceId, (map.get(c.sourceId) ?? 0) + 1);
  return map;
}
