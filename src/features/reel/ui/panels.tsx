"use client";

import { Check, Plus, Save, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fpsWarning } from "../capabilities";
import { ASPECT_INFO, estimateFileSizeMb, formatDuration, videoBitrate } from "../config";
import { PICKER_ACCEPT } from "@/features/editor/upload-validation";
import { FILTER_LABELS, MOTION_LABELS, PRESETS, TRANSITION_LABELS } from "../presets";
import {
  ASPECTS,
  FILTERS,
  FPS_OPTIONS,
  MOTIONS,
  RESOLUTIONS,
  TRANSITIONS,
  type TextKind,
} from "../types";
import { Section, Segmented, Slider, Tile } from "./controls";
import { MusicControls } from "./music-controls";
import { KIND_LABEL, TextEditor } from "./text-editor";
import { cn } from "@/lib/utils";
import type { ReelStudioApi } from "./use-reel-studio";

// -- Media -------------------------------------------------------------------

function MediaTile({ studio, id }: { studio: ReelStudioApi; id: string }) {
  const [loaded, setLoaded] = useState(false);
  const source = studio.sources.find((s) => s.id === id);
  if (!source) return null;
  const count = studio.usage.get(id) ?? 0;
  const thumb = studio.library.thumb(id);
  return (
    <li className="group relative">
      <button
        type="button"
        aria-pressed={count > 0}
        aria-label={`${count > 0 ? "Remove" : "Add"} ${source.name} ${count > 0 ? "from" : "to"} the reel`}
        onClick={() => studio.toggleSource(id)}
        className={cn(
          "relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
          count > 0 ? "border-primary" : "border-input opacity-70 hover:opacity-100",
        )}
      >
        {!loaded ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- local or signed URLs
          <img src={thumb} alt="" loading="lazy" draggable={false} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} className="h-full w-full object-cover" />
        ) : null}
        <span
          aria-hidden
          className={cn(
            "absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full border text-[0.65rem]",
            count > 0 ? "border-primary bg-primary text-primary-foreground" : "border-white/70 bg-black/40 text-transparent",
          )}
        >
          <Check className="size-3" />
        </span>
        {count > 1 ? <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 text-[0.65rem] text-white">×{count}</span> : null}
        {studio.loadErrors[id] ? <span className="absolute inset-x-0 bottom-0 bg-destructive/90 px-1 py-0.5 text-[0.6rem] text-black">Couldn&apos;t load</span> : null}
      </button>
      {source.local ? (
        <button
          type="button"
          aria-label={`Remove ${source.name} from this device's imports`}
          onClick={() => studio.removeLocalSource(id)}
          className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/70 text-white opacity-0 outline-none group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <Trash2 className="size-3" />
        </button>
      ) : null}
    </li>
  );
}

export function MediaPanel({ studio }: { studio: ReelStudioApi }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const used = studio.sources.filter((s) => (studio.usage.get(s.id) ?? 0) > 0).length;
  return (
    <div>
      <Section
        title={`Photos · ${used} of ${studio.sources.length} in the reel`}
        action={
          studio.sources.length > 0 ? (
            <div className="flex gap-1">
              <Button size="xs" variant="ghost" onClick={() => studio.selectAllSources(true)}>
                All
              </Button>
              <Button size="xs" variant="ghost" onClick={() => studio.selectAllSources(false)}>
                None
              </Button>
            </div>
          ) : null
        }
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={PICKER_ACCEPT}
          className="sr-only"
          aria-label="Choose photos from your device"
          onChange={(e) => {
            void studio.addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void studio.addFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn("rounded-xl border border-dashed p-3 text-center transition-colors", over ? "border-primary bg-primary/10" : "border-input")}
        >
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={studio.importing}>
            <Upload data-icon="inline-start" /> {studio.importing ? "Adding…" : "Add photos"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">or drop images here. They stay on this device and never change your memory.</p>
        </div>
        {studio.sources.length === 0 ? (
          <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">This memory has no photos yet. Add some above to build a reel.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {studio.sources.map((s) => (
              <MediaTile key={s.id} studio={studio} id={s.id} />
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">Click a photo to add it to or take it out of the reel. Drag clips in the timeline to reorder.</p>
      </Section>
    </div>
  );
}

// -- Transitions ----------------------------------------------------------------

export function TransitionsPanel({ studio }: { studio: ReelStudioApi }) {
  const { project } = studio;
  const current = project.clips[1]?.transition.kind ?? project.clips[0]?.transition.kind ?? "dissolve";
  return (
    <div>
      <Section title="Transition style">
        <div className="grid grid-cols-2 gap-2">
          {TRANSITIONS.map((t) => (
            <Tile key={t} active={current === t} onClick={() => studio.setTransitionForAll(t, null)}>
              <span className="text-sm text-foreground">{TRANSITION_LABELS[t]}</span>
            </Tile>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Applies to every cut. To change just one, select its clip in the timeline.</p>
      </Section>
      <Section title="Length">
        <Slider
          label="Transition duration"
          value={project.transitionMs}
          min={200}
          max={2000}
          step={50}
          format={(v) => `${(v / 1000).toFixed(2)}s`}
          onChange={(v) => studio.setTransitionForAll(null, v)}
        />
      </Section>
    </div>
  );
}

// -- Effects ----------------------------------------------------------------------

export function EffectsPanel({ studio }: { studio: ReelStudioApi }) {
  const { project } = studio;
  const { look } = project;
  const setLook = (partial: Partial<typeof look>, key?: string) => studio.patch({ look: { ...look, ...partial } }, key ?? null);
  const currentMotion = project.clips[0]?.motion;
  return (
    <div>
      <Section title="Colour grade">
        <div className="grid grid-cols-3 gap-2">
          {FILTERS.map((f) => (
            <Tile key={f} active={look.filter.kind === f} onClick={() => setLook({ filter: { kind: f, intensity: f === "none" ? 0 : look.filter.intensity || 0.6 } })}>
              <span className="text-xs text-foreground">{FILTER_LABELS[f]}</span>
            </Tile>
          ))}
        </div>
        {look.filter.kind !== "none" ? (
          <Slider label="Strength" value={Math.round(look.filter.intensity * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => setLook({ filter: { ...look.filter, intensity: v / 100 } }, "filter")} />
        ) : null}
      </Section>
      <Section title="Film look">
        <Slider label="Film grain" value={Math.round(look.grain * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => setLook({ grain: v / 100 }, "grain")} />
        <Slider label="Vignette" value={Math.round(look.vignette * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => setLook({ vignette: v / 100 }, "vignette")} />
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Motion blur
            <span className="block text-xs text-muted-foreground">Smoother movement; a little heavier to render.</span>
          </span>
          <Switch checked={look.motionBlur} onCheckedChange={(motionBlur) => setLook({ motionBlur })} aria-label="Motion blur" />
        </label>
      </Section>
      <Section title="Photo movement">
        <Slider
          label="Animation intensity"
          value={Math.round(project.motionIntensity * 100)}
          min={0}
          max={200}
          step={5}
          format={(v) => (v === 0 ? "Still" : `${v}%`)}
          onChange={(v) => studio.patch({ motionIntensity: v / 100 }, "motion-intensity")}
        />
        <p className="text-xs text-muted-foreground">Set one move for every clip, or choose per clip from the timeline.</p>
        <div className="grid grid-cols-2 gap-2">
          {MOTIONS.map((m) => (
            <Tile key={m} active={currentMotion === m && project.clips.every((c) => c.motion === m)} onClick={() => studio.setMotionForAll(m)}>
              <span className="text-xs text-foreground">{MOTION_LABELS[m]}</span>
            </Tile>
          ))}
        </div>
      </Section>
    </div>
  );
}

// -- Text -------------------------------------------------------------------------

const ADD_KINDS: TextKind[] = ["title", "subtitle", "location", "caption", "quote", "closing", "custom"];

export function TextPanel({ studio }: { studio: ReelStudioApi }) {
  const { project, selection } = studio;
  const selected = selection?.type === "text" ? project.overlays.find((o) => o.id === selection.id) : undefined;
  return (
    <div>
      <Section title="Add text">
        <div className="flex flex-wrap gap-1.5">
          {ADD_KINDS.map((k) => (
            <Button key={k} size="sm" variant="secondary" onClick={() => studio.addOverlay(k)} disabled={project.clips.length === 0}>
              <Plus data-icon="inline-start" /> {KIND_LABEL[k].replace(" title", "")}
            </Button>
          ))}
        </div>
      </Section>
      <Section title={`On the reel · ${project.overlays.length}`}>
        {project.overlays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No text yet. Add a title, location or quote above.</p>
        ) : (
          <ul className="space-y-1">
            {project.overlays.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  aria-pressed={selected?.id === o.id}
                  onClick={() => studio.setSelection({ type: "text", id: o.id })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected?.id === o.id ? "border-primary bg-primary/10" : "border-transparent bg-muted hover:bg-accent",
                  )}
                >
                  <span className="shrink-0 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">{KIND_LABEL[o.kind].split(" ")[0]}</span>
                  <span className="min-w-0 flex-1 truncate">{o.text || "(empty)"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {selected ? <TextEditor studio={studio} overlay={selected} /> : null}
    </div>
  );
}

// -- Templates ---------------------------------------------------------------------

export function TemplatesPanel({ studio }: { studio: ReelStudioApi }) {
  const { project } = studio;
  return (
    <div>
      <Section title="Reel styles">
        <ul className="space-y-2">
          {PRESETS.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                aria-pressed={project.presetKey === p.key}
                onClick={() => studio.applyPreset(p.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  project.presetKey === p.key ? "border-primary bg-primary/10" : "border-input bg-muted hover:bg-accent",
                )}
              >
                <span aria-hidden className="size-12 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1]})` }} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Choosing a style re-times your clips and refreshes the text and look. Your photo order stays, and Undo brings your edits back.</p>
      </Section>
    </div>
  );
}

// -- Settings ----------------------------------------------------------------------

export function OutputSummary({ studio }: { studio: ReelStudioApi }) {
  const { project, finalSize, totalMs, capabilities } = studio;
  const bitrate = videoBitrate(finalSize.width, finalSize.height, project.fps);
  const format = capabilities.preferred;
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Length</dt>
      <dd className="text-right tabular-nums">{formatDuration(totalMs)}</dd>
      <dt className="text-muted-foreground">Size</dt>
      <dd className="text-right tabular-nums">
        {finalSize.width} × {finalSize.height}
      </dd>
      <dt className="text-muted-foreground">Frame rate</dt>
      <dd className="text-right tabular-nums">{project.fps} fps</dd>
      <dt className="text-muted-foreground">Format</dt>
      <dd className="text-right">{format ? format.label : "Not supported here"}</dd>
      <dt className="text-muted-foreground">Estimated file</dt>
      <dd className="text-right tabular-nums">about {estimateFileSizeMb(totalMs, bitrate).toFixed(1)} MB</dd>
    </dl>
  );
}

export function SettingsPanel({ studio }: { studio: ReelStudioApi }) {
  const { project, finalSize } = studio;
  const warn = fpsWarning(project.fps, finalSize.width, finalSize.height);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div>
      <Section title="Shape">
        <Segmented
          label="Aspect ratio"
          value={project.aspect}
          columns={2}
          options={ASPECTS.map((a) => ({
            value: a,
            label: (
              <span className="block">
                <span className="block text-sm font-medium">{ASPECT_INFO[a].label}</span>
                <span className="block text-[0.65rem] text-muted-foreground">{ASPECT_INFO[a].use}</span>
              </span>
            ),
          }))}
          onChange={(aspect) => studio.patch({ aspect })}
        />
      </Section>
      <Section title="Quality">
        <Segmented label="Resolution" value={project.resolution} options={RESOLUTIONS.map((r) => ({ value: r, label: r }))} onChange={(resolution) => studio.patch({ resolution })} />
        <Segmented label="Frame rate" value={project.fps} options={FPS_OPTIONS.map((f) => ({ value: f, label: `${f} fps` }))} onChange={(fps) => studio.patch({ fps })} />
        {warn ? <p className="rounded-lg bg-warning/15 p-3 text-xs text-warning">{warn}</p> : null}
        <Segmented
          label="Preview quality"
          value={studio.prefs.previewQuality}
          options={[
            { value: "low", label: "Light", hint: "Smoothest on slower devices" },
            { value: "medium", label: "Balanced" },
            { value: "high", label: "Sharp" },
          ]}
          onChange={(previewQuality) => studio.setPref({ previewQuality })}
        />
        <p className="text-xs text-muted-foreground">Preview quality only changes what you see while editing. The export always uses the resolution above.</p>
      </Section>
      <Section title="Guides">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Safe-area guides
            <span className="block text-xs text-muted-foreground">Shows where apps cover the picture.</span>
          </span>
          <Switch checked={studio.prefs.safeArea} onCheckedChange={(safeArea) => studio.setPref({ safeArea })} aria-label="Show safe-area guides in the preview" />
        </label>
      </Section>
      <Section title="Output">
        <OutputSummary studio={studio} />
      </Section>
      <Section title="Project">
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={studio.saveProject}>
            <Save data-icon="inline-start" /> Save project settings
          </Button>
          <p className="text-xs text-muted-foreground">
            {studio.savedAt ? `Saved ${new Date(studio.savedAt).toLocaleTimeString()}. ` : ""}
            Settings are kept in this browser only. Your photos, music and video are never uploaded.
          </p>
          {confirmReset ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
              <p className="text-sm">Reset everything to the “{PRESETS.find((p) => p.key === project.presetKey)?.name}” style?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    studio.resetProject();
                    setConfirmReset(false);
                  }}
                >
                  Reset
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Keep editing
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              Reset to preset
            </Button>
          )}
        </div>
      </Section>
    </div>
  );
}

export function MusicPanel({ studio }: { studio: ReelStudioApi }) {
  return <MusicControls studio={studio} />;
}
