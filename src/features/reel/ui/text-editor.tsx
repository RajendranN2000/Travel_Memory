"use client";

import { AlignCenter, AlignLeft, AlignRight, Copy, Trash2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LIMITS } from "../config";
import { FONT_CHOICES } from "../fonts";
import { resolveOverlays } from "../timeline";
import { TEXT_ANIMATIONS, type TextAnimation, type TextOverlay } from "../types";
import { Field, NativeSelect, Section, Segmented, Slider } from "./controls";
import { snapBounds } from "./safe-area";
import type { ReelStudioApi } from "./use-reel-studio";

const ANIMATION_LABEL: Record<TextAnimation, string> = {
  fade: "Fade",
  rise: "Rise up",
  zoom: "Zoom",
  typewriter: "Typewriter",
  none: "None",
};
const KIND_LABEL: Record<TextOverlay["kind"], string> = {
  title: "Opening title",
  subtitle: "Subtitle",
  location: "Location label",
  caption: "Caption",
  quote: "Memory quote",
  closing: "Closing title",
  custom: "Custom text",
};
export { KIND_LABEL };

const SWATCHES = ["#ffffff", "#f7f3ec", "#ffe3a3", "#ffb8a1", "#bfe3c0", "#a9d4ff", "#111111"];

export function TextEditor({ studio, overlay }: { studio: ReelStudioApi; overlay: TextOverlay }) {
  const textId = useId();
  const colorId = useId();
  const { patchOverlay, project, totalMs } = studio;
  const resolved = resolveOverlays(project).find((r) => r.overlay.id === overlay.id);
  const start = resolved?.startMs ?? 0;
  const bounds = snapBounds(project.aspect);
  const set = (partial: Partial<Omit<TextOverlay, "id">>, key?: string) => patchOverlay(overlay.id, partial, key ? `${key}:${overlay.id}` : null);

  return (
    <div>
      <Section
        title={KIND_LABEL[overlay.kind]}
        action={
          <div className="flex gap-1">
            <Button size="icon-xs" variant="ghost" aria-label="Duplicate text" onClick={() => studio.duplicateOverlay(overlay.id)}>
              <Copy />
            </Button>
            <Button size="icon-xs" variant="ghost" aria-label="Delete text" onClick={() => studio.deleteOverlay(overlay.id)}>
              <Trash2 />
            </Button>
          </div>
        }
      >
        <Field label="Text" htmlFor={textId}>
          <textarea
            id={textId}
            value={overlay.text}
            rows={3}
            maxLength={240}
            onChange={(e) => set({ text: e.target.value }, "text")}
            className="w-full resize-y rounded-lg border border-input bg-muted px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </Field>
        <NativeSelect label="Entrance and exit" value={overlay.animation} options={TEXT_ANIMATIONS.map((a) => ({ value: a, label: ANIMATION_LABEL[a] }))} onChange={(animation) => set({ animation })} />
      </Section>

      <Section title="Timing">
        <Slider
          label="Appears at"
          value={Math.round(start)}
          min={0}
          max={Math.max(LIMITS.minTextMs, totalMs - LIMITS.minTextMs)}
          step={100}
          format={(v) => `${(v / 1000).toFixed(1)}s`}
          onChange={(v) => studio.moveOverlay(overlay.id, v, overlay.durationMs)}
        />
        <Slider
          label="Stays for"
          value={overlay.durationMs}
          min={LIMITS.minTextMs}
          max={Math.max(LIMITS.minTextMs * 2, totalMs - Math.round(start))}
          step={100}
          format={(v) => `${(v / 1000).toFixed(1)}s`}
          onChange={(v) => studio.moveOverlay(overlay.id, start, v)}
        />
      </Section>

      <Section title="Style">
        <NativeSelect label="Font" value={overlay.font} options={FONT_CHOICES.map((f) => ({ value: f.key, label: f.label }))} onChange={(font) => set({ font })} />
        <Slider label="Size" value={overlay.sizePct} min={1.5} max={14} step={0.1} format={(v) => v.toFixed(1)} onChange={(sizePct) => set({ sizePct }, "size")} />
        <Segmented
          label="Weight"
          value={overlay.weight}
          options={[
            { value: 400, label: "Regular" },
            { value: 500, label: "Medium" },
            { value: 600, label: "Semi" },
            { value: 700, label: "Bold" },
          ]}
          onChange={(weight) => set({ weight })}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center justify-between gap-2 text-sm">
            Italic <Switch checked={overlay.italic} onCheckedChange={(italic) => set({ italic })} aria-label="Italic" />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            Capitals <Switch checked={overlay.uppercase} onCheckedChange={(uppercase) => set({ uppercase })} aria-label="All capitals" />
          </label>
        </div>
        <Slider label="Letter spacing" value={overlay.tracking} min={0} max={0.4} step={0.01} format={(v) => v.toFixed(2)} onChange={(tracking) => set({ tracking }, "tracking")} />
        <Field label="Colour" htmlFor={colorId}>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use colour ${c}`}
                aria-pressed={overlay.color.toLowerCase() === c}
                onClick={() => set({ color: c })}
                className="size-8 rounded-full border border-white/20 outline-none focus-visible:ring-3 focus-visible:ring-ring/60 aria-pressed:ring-2 aria-pressed:ring-primary"
                style={{ backgroundColor: c }}
              />
            ))}
            <input id={colorId} type="color" value={overlay.color} onChange={(e) => set({ color: e.target.value }, "color")} className="size-8 cursor-pointer rounded-full border border-input bg-transparent p-0" aria-label="Custom colour" />
          </div>
        </Field>
        <label className="flex items-center justify-between gap-2 text-sm">
          Soft shadow <Switch checked={overlay.shadow} onCheckedChange={(shadow) => set({ shadow })} aria-label="Soft shadow behind the text" />
        </label>
      </Section>

      <Section title="Position">
        <div role="radiogroup" aria-label="Alignment" className="grid grid-cols-3 gap-1.5">
          {(
            [
              ["left", AlignLeft],
              ["center", AlignCenter],
              ["right", AlignRight],
            ] as const
          ).map(([align, Icon]) => (
            <Button key={align} variant={overlay.align === align ? "secondary" : "outline"} size="sm" role="radio" aria-checked={overlay.align === align} aria-label={`Align ${align}`} onClick={() => set({ align })}>
              <Icon />
            </Button>
          ))}
        </div>
        <Slider label="Horizontal" value={Math.round(overlay.x * 100)} min={10} max={90} format={(v) => `${v}%`} onChange={(v) => set({ x: v / 100 }, "x")} />
        <Slider label="Vertical" value={Math.round(overlay.y * 100)} min={5} max={95} format={(v) => `${v}%`} onChange={(v) => set({ y: v / 100 }, "y")} />
        <div className="grid grid-cols-3 gap-1.5">
          <Button variant="outline" size="sm" onClick={() => set({ y: bounds.top })}>
            Top
          </Button>
          <Button variant="outline" size="sm" onClick={() => set({ y: bounds.center })}>
            Centre
          </Button>
          <Button variant="outline" size="sm" onClick={() => set({ y: bounds.lowerThird })}>
            Lower
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Turn on safe-area guides in the preview to keep text clear of app buttons and captions.</p>
      </Section>
    </div>
  );
}
