"use client";

import { AlignCenter, AlignHorizontalJustifyCenter, AlignJustify, AlignLeft, AlignRight, AlignVerticalJustifyCenter, ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Copy, Crop, Lock, LockOpen, Trash2, TriangleAlert } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, NativeSelect, Section, Segmented, Slider } from "@/features/reel/ui/controls";
import { cn } from "@/lib/utils";
import { FILTER_LABELS } from "../filters";
import { FAMILIES, FAMILY_KEYS, styleAvailable } from "../fonts";
import { getLayout } from "../layouts";
import { alignElement, fitTextSize, growTextBox, moveLayer, setImageMode, type AlignTo } from "../ops";
import { projectGeometry } from "../display-list";
import type { BookElement, BookPage, FitMode, ImageElement, ImageFilter, ShapeElement, TextElement } from "../types";
import type { BookStudioApi } from "./use-book-studio";

function NumberField({ label, value, onChange, step = 0.5, min, max, suffix = "mm" }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          className="h-9 w-full rounded-lg border border-input bg-muted pr-9 pl-2.5 text-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[0.65rem] text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange, swatches }: { label: string; value: string; onChange: (c: string) => void; swatches: string[] }) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((c, i) => (
          <button key={`${c}${i}`} type="button" aria-label={`${label} ${c}`} aria-pressed={value.toLowerCase() === c.toLowerCase()} onClick={() => onChange(c)} className="size-7 rounded-full border border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/60 aria-pressed:ring-2 aria-pressed:ring-primary" style={{ backgroundColor: c }} />
        ))}
        <input type="color" aria-label={`Custom ${label.toLowerCase()}`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0" />
      </div>
    </Field>
  );
}

function themeSwatches(studio: BookStudioApi) {
  const t = studio.project.theme;
  return [t.ink, t.paper, t.muted, t.accent, t.accent2, "#ffffff", "#000000"];
}

function FrameFields({ studio, page, el }: { studio: BookStudioApi; page: BookPage; el: BookElement }) {
  const set = (patch: Partial<typeof el.frame>) => studio.setFrame(page.id, el.id, { ...el.frame, ...patch }, `frame-num:${el.id}`);
  return (
    <Section title="Position and size">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={el.frame.x} onChange={(x) => set({ x })} />
        <NumberField label="Y" value={el.frame.y} onChange={(y) => set({ y })} />
        <NumberField label="Width" value={el.frame.w} onChange={(w) => set({ w })} min={4} />
        <NumberField label="Height" value={el.frame.h} onChange={(h) => set({ h })} min={4} />
      </div>
    </Section>
  );
}

function ArrangeSection({ studio, page, el }: { studio: BookStudioApi; page: BookPage; el: BookElement }) {
  const layer = (m: Parameters<typeof moveLayer>[3]) => studio.update((p) => moveLayer(p, page.id, el.id, m));
  const align = (a: AlignTo) => studio.update((p) => alignElement(p, page.id, el.id, a));
  const btn = "size-9";
  return (
    <Section title="Arrange">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Align on the page">
        <Button size="icon-sm" variant="secondary" className={btn} aria-label="Align left" title="Align left" onClick={() => align("left")}><AlignLeft /></Button>
        <Button size="icon-sm" variant="secondary" className={btn} aria-label="Centre horizontally" title="Centre horizontally" onClick={() => align("center")}><AlignHorizontalJustifyCenter /></Button>
        <Button size="icon-sm" variant="secondary" className={btn} aria-label="Align right" title="Align right" onClick={() => align("right")}><AlignRight /></Button>
        <Button size="icon-sm" variant="secondary" className={btn} aria-label="Align top" title="Align top" onClick={() => align("top")}><ArrowUpToLine /></Button>
        <Button size="icon-sm" variant="secondary" className={btn} aria-label="Centre vertically" title="Centre vertically" onClick={() => align("middle")}><AlignVerticalJustifyCenter /></Button>
        <Button size="icon-sm" variant="secondary" className={btn} aria-label="Align bottom" title="Align bottom" onClick={() => align("bottom")}><ArrowDownToLine /></Button>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Layer order">
        <Button size="sm" variant="secondary" onClick={() => layer("front")}>To front</Button>
        <Button size="icon-sm" variant="secondary" aria-label="Bring forward" onClick={() => layer("forward")}><ArrowUp /></Button>
        <Button size="icon-sm" variant="secondary" aria-label="Send backward" onClick={() => layer("backward")}><ArrowDown /></Button>
        <Button size="sm" variant="secondary" onClick={() => layer("back")}>To back</Button>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="secondary" onClick={() => studio.duplicateElementById(page.id, el.id)}><Copy data-icon="inline-start" /> Duplicate</Button>
        <Button size="sm" variant="secondary" onClick={() => studio.patchElement(page.id, el.id, { locked: !el.locked }, null)} aria-pressed={Boolean(el.locked)}>
          {el.locked ? <LockOpen data-icon="inline-start" /> : <Lock data-icon="inline-start" />} {el.locked ? "Unlock" : "Lock"}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => studio.deleteElement(page.id, el.id)}><Trash2 data-icon="inline-start" /> Delete</Button>
      </div>
    </Section>
  );
}

const MODE_INFO: Record<FitMode, { label: string; hint: string }> = {
  contain: { label: "Fit whole photo", hint: "Shows the entire photo. Blank space appears around it if the shapes differ." },
  fill: { label: "Fill frame", hint: "Fills the frame and crops only inside it. Choose which part stays." },
  original: { label: "Original proportions", hint: "The whole photo, as large as the safe area allows." },
  "full-page": { label: "Full page", hint: "Spreads across the whole page. Off by default: the whole photo is kept." },
  custom: { label: "Custom crop", hint: "Pick exactly which part of the photo to show." },
};

function ImageProperties({ studio, page, el, onCrop }: { studio: BookStudioApi; page: BookPage; el: ImageElement; onCrop: (elementId: string) => void }) {
  const set = (patch: Partial<ImageElement>, key: string | null = null) => studio.patchElement(page.id, el.id, patch, key);
  const index = studio.project.pages.findIndex((p) => p.id === page.id);
  const render = studio.renderOf(page, index);
  const placement = render.placements.get(el.id);
  const source = el.sourceId ? studio.sourceById.get(el.sourceId) : undefined;
  const geom = projectGeometry(studio.project);
  const setMode = (mode: FitMode) => studio.update((p) => setImageMode(p, page.id, el.id, mode, source));
  const setFilter = (f: Partial<ImageFilter>, key: string | null = null) => set({ filter: { ...el.filter, ...f } }, key);
  return (
    <>
      <Section title="Photo">
        <div className="flex items-center gap-3">
          {source ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated object URLs
            <img src={studio.images.previewUrl(source.id, 320) ?? ""} alt="" className="size-16 shrink-0 rounded-lg bg-muted object-cover" />
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-input text-[0.65rem] text-muted-foreground">Empty</div>
          )}
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{source?.name ?? "No photo yet"}</p>
            <p className="text-xs text-muted-foreground">{source ? `${source.width} × ${source.height} px` : "Drag one in from the Photos tab"}</p>
          </div>
        </div>
        {source ? (
          <div className="flex flex-wrap gap-2">
            <NativeSelect label="Replace with" value="" options={[{ value: "", label: "Choose another photo…" }, ...studio.sources.map((s) => ({ value: s.id, label: s.name }))]} onChange={(id) => id && studio.placeSource(id, { pageId: page.id, elementId: el.id })} />
            <Button size="sm" variant="ghost" onClick={() => set({ sourceId: null })}>Empty the frame</Button>
          </div>
        ) : null}
      </Section>

      <Section title="How the photo fits">
        <div role="radiogroup" aria-label="Photo fitting" className="grid gap-1.5">
          {(Object.keys(MODE_INFO) as FitMode[]).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={el.mode === m} onClick={() => setMode(m)} className={cn("rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", el.mode === m ? "border-primary bg-primary/10" : "border-input bg-muted hover:bg-accent")}>
              <span className="block text-sm font-medium">{MODE_INFO[m].label}</span>
              <span className="block text-xs text-muted-foreground">{MODE_INFO[m].hint}</span>
            </button>
          ))}
        </div>
        {placement ? (
          <p className={cn("rounded-lg p-3 text-xs", placement.isCropped ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}>
            {placement.isCropped ? `About ${Math.round(placement.croppedFraction * 100)}% of the photo is hidden by the crop.` : "The whole photo is shown. Nothing is cropped."} Prints at about {Math.round(placement.effectiveDpi)} DPI.
          </p>
        ) : null}
        {placement?.isCropped ? (
          <Button size="sm" variant="secondary" onClick={() => (el.mode === "full-page" ? set({ coverPage: false }) : setMode("contain"))}>
            Show the whole photo instead
          </Button>
        ) : null}
        {el.mode === "fill" || (el.mode === "full-page" && el.coverPage) ? (
          <>
            <Slider label="Zoom" value={el.zoom} min={1} max={4} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(zoom) => set({ zoom }, `zoom:${el.id}`)} />
            <Slider label="Focus left to right" value={Math.round(el.focusX * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => set({ focusX: v / 100 }, `fx:${el.id}`)} />
            <Slider label="Focus top to bottom" value={Math.round(el.focusY * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => set({ focusY: v / 100 }, `fy:${el.id}`)} />
          </>
        ) : null}
        {el.mode === "fill" || el.mode === "custom" ? (
          <Button size="sm" variant="secondary" onClick={() => onCrop(el.id)} disabled={!source}>
            <Crop data-icon="inline-start" /> {el.mode === "custom" ? "Edit crop" : "Adjust crop"}
          </Button>
        ) : null}
        {el.mode === "custom" ? (
          <Button size="sm" variant="ghost" onClick={() => set({ crop: { x: 0, y: 0, w: 1, h: 1 } })}>Reset to the whole photo</Button>
        ) : null}
        {el.mode === "full-page" ? (
          <>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Fill the page <span className="block text-xs text-muted-foreground">Crops the edges so there are no blank bands.</span></span>
              <Switch checked={el.coverPage} onCheckedChange={(coverPage) => set({ coverPage })} aria-label="Fill the page, cropping the edges" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Edge to edge (bleed) <span className="block text-xs text-muted-foreground">Extends into the {studio.project.settings.bleedMm} mm bleed for printing.</span></span>
              <Switch
                checked={el.fullBleed && page.fullBleed}
                onCheckedChange={(on) => {
                  studio.setPageProps(page.id, (p) => ({ ...p, fullBleed: on || p.elements.some((e) => e.type === "image" && e.id !== el.id && e.fullBleed) }));
                  studio.patchElement(page.id, el.id, { fullBleed: on, frame: on ? geom.bleed : geom.trim } as Partial<ImageElement>);
                }}
                aria-label="Extend the photo to the bleed edge"
              />
            </label>
          </>
        ) : null}
      </Section>

      <FrameFields studio={studio} page={page} el={el} />

      <Section title="Frame style">
        <Slider label="Border" value={el.borderMm} min={0} max={6} step={0.1} format={(v) => `${v.toFixed(1)} mm`} onChange={(borderMm) => set({ borderMm }, `bw:${el.id}`)} />
        {el.borderMm > 0 ? <ColorField label="Border colour" value={el.borderColor} onChange={(borderColor) => set({ borderColor })} swatches={["#ffffff", "#000000", ...themeSwatches(studio)]} /> : null}
        <Slider label="Rounded corners" value={el.radiusMm} min={0} max={20} step={0.5} format={(v) => `${v} mm`} onChange={(radiusMm) => set({ radiusMm }, `rad:${el.id}`)} />
        <label className="flex items-center justify-between gap-3 text-sm">
          Soft shadow
          <Switch checked={el.shadow} onCheckedChange={(shadow) => set({ shadow })} aria-label="Soft shadow" />
        </label>
        <Slider label="Opacity" value={Math.round(el.opacity * 100)} min={10} max={100} format={(v) => `${v}%`} onChange={(v) => set({ opacity: v / 100 }, `op:${el.id}`)} />
      </Section>

      <Section title="Colour and tone">
        <NativeSelect label="Filter" value={el.filter.preset} options={(Object.keys(FILTER_LABELS) as ImageFilter["preset"][]).map((k) => ({ value: k, label: FILTER_LABELS[k] }))} onChange={(preset) => setFilter({ preset })} />
        <Slider label="Brightness" value={Math.round(el.filter.brightness * 100)} min={-100} max={100} format={(v) => `${v}`} onChange={(v) => setFilter({ brightness: v / 100 }, `br:${el.id}`)} />
        <Slider label="Contrast" value={Math.round(el.filter.contrast * 100)} min={-100} max={100} format={(v) => `${v}`} onChange={(v) => setFilter({ contrast: v / 100 }, `co:${el.id}`)} />
        <Slider label="Saturation" value={Math.round(el.filter.saturation * 100)} min={-100} max={100} format={(v) => `${v}`} onChange={(v) => setFilter({ saturation: v / 100 }, `sa:${el.id}`)} />
        <p className="text-xs text-muted-foreground">Applied to the photo itself, in the preview and in the PDF.</p>
      </Section>

      <Section title="Description">
        <input value={el.alt} maxLength={160} onChange={(e) => set({ alt: e.target.value }, `alt:${el.id}`)} aria-label="Photo description for accessibility" placeholder="Describe the photo (optional)" className="h-9 w-full rounded-lg border border-input bg-muted px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
      </Section>
      <ArrangeSection studio={studio} page={page} el={el} />
    </>
  );
}

function TextProperties({ studio, page, el }: { studio: BookStudioApi; page: BookPage; el: TextElement }) {
  const textId = useId();
  const set = (patch: Partial<TextElement>, key: string | null = null) => studio.patchElement(page.id, el.id, patch, key);
  const setStyle = (patch: Partial<TextElement["style"]>, key: string | null = null) => set({ style: { ...el.style, ...patch } }, key);
  const index = studio.project.pages.findIndex((p) => p.id === page.id);
  const layout = studio.renderOf(page, index).layouts.get(el.id);
  const avail = styleAvailable(el.style.font, true, true);
  const info = FAMILIES[el.style.font];
  return (
    <>
      <Section title="Text">
        {el.field === "pageNumber" ? (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">This is the page number. It fills itself in and follows the page order.</p>
        ) : (
          <Field label="Content" htmlFor={textId}>
            <textarea id={textId} value={el.text} rows={5} onChange={(e) => set({ text: e.target.value }, `text:${el.id}`)} className="w-full resize-y rounded-lg border border-input bg-muted px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
          </Field>
        )}
        {layout?.overflow ? (
          <div role="alert" className="space-y-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <p className="flex items-start gap-2"><TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" /> Some text doesn&apos;t fit its box ({layout.hiddenLines} line{layout.hiddenLines === 1 ? "" : "s"} hidden). It will be cut off in print.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="xs" variant="secondary" onClick={() => setStyle({ sizePt: fitTextSize(el, studio.fonts) }, null)}>Shrink text to fit</Button>
              <Button size="xs" variant="secondary" onClick={() => set({ frame: growTextBox(studio.project, el, studio.fonts) })}>Grow the box</Button>
            </div>
          </div>
        ) : null}
        {layout?.missingGlyphs.length ? (
          <p role="alert" className="rounded-lg bg-warning/15 p-3 text-xs text-warning">This font can&apos;t show {layout.missingGlyphs.slice(0, 8).join(" ")}. Pick a different font or remove those characters, or they won&apos;t print.</p>
        ) : null}
      </Section>

      <Section title="Font">
        <NativeSelect label="Font family" value={el.style.font} options={FAMILY_KEYS.map((k) => ({ value: k, label: FAMILIES[k].label }))} onChange={(font) => setStyle({ font })} />
        <Slider label="Size" value={el.style.sizePt} min={5} max={96} step={0.5} format={(v) => `${Math.round(v * 10) / 10} pt`} onChange={(sizePt) => setStyle({ sizePt: Math.round(sizePt * 10) / 10 }, `sz:${el.id}`)} />
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Text style">
          <Button size="sm" variant={el.style.bold ? "default" : "secondary"} aria-pressed={el.style.bold} disabled={!info.has.bold} onClick={() => setStyle({ bold: !el.style.bold })}>Bold</Button>
          <Button size="sm" variant={el.style.italic ? "default" : "secondary"} aria-pressed={el.style.italic} disabled={!info.has.italic} onClick={() => setStyle({ italic: !el.style.italic })}>Italic</Button>
          <Button size="sm" variant={el.style.uppercase ? "default" : "secondary"} aria-pressed={el.style.uppercase} onClick={() => setStyle({ uppercase: !el.style.uppercase })}>CAPS</Button>
        </div>
        {!avail.bold || !avail.italic ? <p className="text-xs text-muted-foreground">{info.label} doesn&apos;t include {!info.has.bold ? "a bold" : ""}{!info.has.bold && !info.has.italic ? " or " : ""}{!info.has.italic ? "an italic" : ""} style, so it isn&apos;t faked.</p> : null}
        <ColorField label="Text colour" value={el.style.color} onChange={(color) => setStyle({ color })} swatches={themeSwatches(studio)} />
      </Section>

      <Section title="Paragraph">
        <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Alignment">
          {(
            [
              ["left", AlignLeft],
              ["center", AlignCenter],
              ["right", AlignRight],
              ["justify", AlignJustify],
            ] as const
          ).map(([a, Icon]) => (
            <Button key={a} variant={el.style.align === a ? "default" : "secondary"} size="icon-sm" className="w-full" role="radio" aria-checked={el.style.align === a} aria-label={`Align ${a}`} onClick={() => setStyle({ align: a })}>
              <Icon />
            </Button>
          ))}
        </div>
        <Slider label="Line spacing" value={el.style.lineHeight} min={0.9} max={2.2} step={0.05} format={(v) => v.toFixed(2)} onChange={(lineHeight) => setStyle({ lineHeight }, `lh:${el.id}`)} />
        <Slider label="Letter spacing" value={el.style.trackingPt} min={-1} max={8} step={0.1} format={(v) => `${v.toFixed(1)} pt`} onChange={(trackingPt) => setStyle({ trackingPt }, `tr:${el.id}`)} />
        <Slider label="Paragraph spacing" value={el.style.paraSpacingPt} min={0} max={24} step={0.5} format={(v) => `${v} pt`} onChange={(paraSpacingPt) => setStyle({ paraSpacingPt }, `ps:${el.id}`)} />
        <Segmented label="Columns" value={el.columns} options={[{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }]} onChange={(columns) => set({ columns })} />
        {el.columns > 1 ? <Slider label="Column gap" value={el.columnGapMm} min={2} max={20} step={0.5} format={(v) => `${v} mm`} onChange={(columnGapMm) => set({ columnGapMm }, `cg:${el.id}`)} /> : null}
        <Slider label="Padding" value={el.paddingMm} min={0} max={15} step={0.5} format={(v) => `${v} mm`} onChange={(paddingMm) => set({ paddingMm }, `pd:${el.id}`)} />
        {el.columns === 1 ? <Segmented label="Vertical position" value={el.valign} options={[{ value: "top", label: "Top" }, { value: "middle", label: "Middle" }, { value: "bottom", label: "Bottom" }]} onChange={(valign) => set({ valign })} /> : null}
      </Section>

      <FrameFields studio={studio} page={page} el={el} />

      <Section title="Box">
        <Slider label="Opacity" value={Math.round(el.opacity * 100)} min={10} max={100} format={(v) => `${v}%`} onChange={(v) => set({ opacity: v / 100 }, `op:${el.id}`)} />
        <ColorField label="Box colour" value={el.background ?? "#00000000"} onChange={(background) => set({ background })} swatches={[studio.project.theme.paper, "#ffffff", "#000000", studio.project.theme.accent]} />
        {el.background ? <Button size="sm" variant="ghost" onClick={() => set({ background: undefined })}>No box colour</Button> : null}
      </Section>
      <ArrangeSection studio={studio} page={page} el={el} />
    </>
  );
}

function ShapeProperties({ studio, page, el }: { studio: BookStudioApi; page: BookPage; el: ShapeElement }) {
  const set = (patch: Partial<ShapeElement>, key: string | null = null) => studio.patchElement(page.id, el.id, patch, key);
  const sw = themeSwatches(studio);
  return (
    <>
      <Section title={el.shape === "line" ? "Line" : el.shape === "ellipse" ? "Circle" : "Rectangle"}>
        {el.shape !== "line" ? <ColorField label="Fill" value={el.fill ?? "#00000000"} onChange={(fill) => set({ fill })} swatches={sw} /> : null}
        {el.shape !== "line" && el.fill ? <Button size="sm" variant="ghost" onClick={() => set({ fill: null })}>No fill</Button> : null}
        <ColorField label="Outline" value={el.stroke ?? "#00000000"} onChange={(stroke) => set({ stroke })} swatches={sw} />
        {el.stroke ? <Button size="sm" variant="ghost" onClick={() => set({ stroke: null })}>No outline</Button> : null}
        <Slider label={el.shape === "line" ? "Thickness" : "Outline width"} value={el.strokeMm} min={0.1} max={5} step={0.1} format={(v) => `${v.toFixed(1)} mm`} onChange={(strokeMm) => set({ strokeMm }, `sw:${el.id}`)} />
        {el.shape === "rect" ? <Slider label="Rounded corners" value={el.radiusMm} min={0} max={30} step={0.5} format={(v) => `${v} mm`} onChange={(radiusMm) => set({ radiusMm }, `rr:${el.id}`)} /> : null}
        <Slider label="Opacity" value={Math.round(el.opacity * 100)} min={5} max={100} format={(v) => `${v}%`} onChange={(v) => set({ opacity: v / 100 }, `op:${el.id}`)} />
      </Section>
      <FrameFields studio={studio} page={page} el={el} />
      <ArrangeSection studio={studio} page={page} el={el} />
    </>
  );
}

function PageProperties({ studio, page }: { studio: BookStudioApi; page: BookPage }) {
  const index = studio.project.pages.findIndex((p) => p.id === page.id);
  const layout = getLayout(page.layoutKey);
  const issues = studio.issues.filter((i) => i.pageId === page.id);
  return (
    <>
      <Section title={`Page ${index + 1}`}>
        <p className="text-sm text-muted-foreground">{layout ? `Layout: ${layout.name}.` : "Custom page."} Click a photo, text or shape on the page to edit it.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={!page.layoutKey} onClick={() => studio.resetPage(page.id)}>Reset to layout</Button>
          <Button size="sm" variant="secondary" onClick={() => studio.duplicatePageById(page.id)}><Copy data-icon="inline-start" /> Duplicate page</Button>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Allow edge-to-edge photos <span className="block text-xs text-muted-foreground">Lets photos on this page reach the bleed.</span></span>
          <Switch checked={page.fullBleed} onCheckedChange={(fullBleed) => studio.setPageProps(page.id, (p) => ({ ...p, fullBleed }))} aria-label="Allow edge-to-edge photos on this page" />
        </label>
      </Section>

      {page.unplaced.length > 0 ? (
        <Section title={`Not placed · ${page.unplaced.length}`}>
          <p className="text-xs text-muted-foreground">These didn&apos;t fit the layout. They aren&apos;t on the page, and won&apos;t print, until you place them.</p>
          <ul className="space-y-1.5">
            {page.unplaced.map((u) => (
              <li key={u.id} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{u.type === "text" ? u.text || "Text" : u.type === "image" ? (u.sourceId ? (studio.sourceById.get(u.sourceId)?.name ?? "Photo") : "Empty frame") : "Shape"}</span>
                <Button size="xs" variant="secondary" onClick={() => studio.update((p) => placeUnplacedOp(p, page.id, u.id))}>Place</Button>
                <Button size="xs" variant="ghost" onClick={() => studio.update((p) => discardUnplacedOp(p, page.id, u.id))}>Discard</Button>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="secondary" onClick={() => studio.update((p) => unplacedToNewPageOp(p, page.id))}>Move them to a new page</Button>
        </Section>
      ) : null}

      <Section title="Checks for this page">
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to fix here.</p>
        ) : (
          <ul className="space-y-1.5">
            {issues.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => studio.selectElement(page.id, i.elementId ?? null)} className={cn("flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50", i.severity === "error" ? "bg-destructive/10 text-destructive" : i.severity === "warning" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}>
                  <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" /> {i.message}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

import { discardUnplaced as discardUnplacedOp, placeUnplaced as placeUnplacedOp, unplacedToNewPage } from "../ops";
const unplacedToNewPageOp = (p: Parameters<typeof unplacedToNewPage>[0], id: string) => unplacedToNewPage(p, id).project;

export function Properties({ studio, onCrop }: { studio: BookStudioApi; onCrop: (elementId: string) => void }) {
  const { page, selectedElement } = studio;
  if (!page) return null;
  if (selectedElement?.type === "image") return <ImageProperties studio={studio} page={page} el={selectedElement} onCrop={onCrop} />;
  if (selectedElement?.type === "text") return <TextProperties studio={studio} page={page} el={selectedElement} />;
  if (selectedElement?.type === "shape") return <ShapeProperties studio={studio} page={page} el={selectedElement} />;
  return <PageProperties studio={studio} page={page} />;
}
