import type { RenderScene } from "./renderer";
import { layoutClips, resolveOverlays } from "./timeline";
import type { ReelProject } from "./types";

export function buildScene(project: ReelProject, getImage: RenderScene["getImage"], families: Record<string, string>): RenderScene {
  const slots = layoutClips(project.clips);
  const totalMs = slots.length ? slots[slots.length - 1].endMs : 0;
  return { project, slots, totalMs, overlays: resolveOverlays(project), families, getImage };
}

/** Photos needed right now and those needed in the next few seconds. */
export function neededSources(scene: Pick<RenderScene, "slots">, tMs: number, lookaheadMs = 4000): { now: string[]; ahead: string[] } {
  const now = new Set<string>();
  const ahead = new Set<string>();
  for (const s of scene.slots) {
    if (tMs >= s.startMs && tMs < s.endMs) now.add(s.clip.sourceId);
    else if (s.startMs >= tMs && s.startMs < tMs + lookaheadMs) ahead.add(s.clip.sourceId);
  }
  // At or past the end the last clip is held.
  if (!now.size && scene.slots.length) now.add(scene.slots[scene.slots.length - 1].clip.sourceId);
  for (const id of now) ahead.delete(id);
  return { now: [...now], ahead: [...ahead] };
}
