"use client";

import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "../config";
import { MOTION_LABELS, TRANSITION_LABELS } from "../presets";
import { effectiveTransition } from "../timeline";
import { MOTIONS, TRANSITIONS } from "../types";
import { NativeSelect, Section, Segmented, Slider } from "./controls";
import type { ReelStudioApi } from "./use-reel-studio";

export function ClipInspector({ studio, clipId }: { studio: ReelStudioApi; clipId: string }) {
  const { project, library } = studio;
  const index = project.clips.findIndex((c) => c.id === clipId);
  const clip = project.clips[index];
  if (!clip) return null;
  const source = studio.sources.find((s) => s.id === clip.sourceId);
  const thumb = library.thumb(clip.sourceId);
  const first = index === 0;
  const applied = effectiveTransition(project.clips[index - 1], clip);

  return (
    <div>
      <Section
        title={`Clip ${index + 1} of ${project.clips.length}`}
        action={
          <div className="flex gap-1">
            <Button size="icon-xs" variant="ghost" aria-label="Duplicate clip" onClick={() => studio.duplicate(clip.id)}>
              <Copy />
            </Button>
            <Button size="icon-xs" variant="ghost" aria-label="Delete clip" onClick={() => studio.deleteClip(clip.id)}>
              <Trash2 />
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- local or signed URLs
            <img src={thumb} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="size-16 shrink-0 rounded-lg bg-muted" />
          )}
          <p className="min-w-0 text-sm text-muted-foreground">
            <span className="block truncate text-foreground">{source?.name ?? "Photo"}</span>
            {source?.location || (source ? `${source.width} × ${source.height}` : "")}
          </p>
        </div>
        <Slider
          label="Length"
          value={clip.durationMs}
          min={LIMITS.minClipMs}
          max={LIMITS.maxClipMs}
          step={100}
          format={(v) => `${(v / 1000).toFixed(1)}s`}
          onChange={(v) => studio.setDuration(clip.id, v)}
        />
      </Section>

      <Section title="Movement">
        <NativeSelect label="Camera move" value={clip.motion} options={MOTIONS.map((m) => ({ value: m, label: MOTION_LABELS[m] }))} onChange={(motion) => studio.patchClip(clip.id, { motion })} />
        <Segmented
          label="Framing"
          value={clip.fit}
          options={[
            { value: "cover", label: "Fill frame", hint: "Crop the photo to fill the whole frame" },
            { value: "contain", label: "Whole photo", hint: "Show the whole photo over a soft blurred backdrop" },
          ]}
          onChange={(fit) => studio.patchClip(clip.id, { fit })}
        />
        {clip.fit === "cover" ? (
          <>
            <Slider label="Focus left to right" value={clip.focusX} min={0} max={100} format={(v) => `${v}%`} onChange={(focusX) => studio.patchClip(clip.id, { focusX }, `focus:${clip.id}`)} />
            <Slider label="Focus top to bottom" value={clip.focusY} min={0} max={100} format={(v) => `${v}%`} onChange={(focusY) => studio.patchClip(clip.id, { focusY }, `focus:${clip.id}`)} />
          </>
        ) : null}
      </Section>

      <Section title="Transition in">
        {first ? (
          <p className="text-sm text-muted-foreground">The first clip has no transition in. Pick a later clip to change how it arrives.</p>
        ) : (
          <>
            <NativeSelect
              label="Style"
              value={clip.transition.kind}
              options={TRANSITIONS.map((t) => ({ value: t, label: TRANSITION_LABELS[t] }))}
              onChange={(kind) => studio.patchClip(clip.id, { transition: { ...clip.transition, kind } })}
            />
            {clip.transition.kind !== "none" ? (
              <>
                <Slider
                  label="Duration"
                  value={clip.transition.durationMs}
                  min={LIMITS.minTransitionMs}
                  max={LIMITS.maxTransitionMs}
                  step={50}
                  format={(v) => `${(v / 1000).toFixed(2)}s`}
                  onChange={(durationMs) => studio.patchClip(clip.id, { transition: { ...clip.transition, durationMs } }, `tr:${clip.id}`)}
                />
                {applied < clip.transition.durationMs ? (
                  <p className="text-xs text-muted-foreground">Shortened to {(applied / 1000).toFixed(2)}s because neighbouring clips are short.</p>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </Section>
    </div>
  );
}
