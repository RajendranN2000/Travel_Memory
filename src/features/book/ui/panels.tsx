"use client";

import { Check, Circle, Copy, ImagePlus, Minus, Plus, Square, Trash2, Type, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Field, NativeSelect, Section, Segmented, Slider } from "@/features/reel/ui/controls";
import { cn } from "@/lib/utils";
import { PICKER_ACCEPT } from "@/features/editor/upload-validation";
import { FAMILIES } from "../fonts";
import { GROUP_LABELS, LAYOUTS, layoutCtx, type LayoutGroup } from "../layouts";
import { CATEGORY_LABELS, TEMPLATES, THEMES, destinationTheme, type TemplateCategory } from "../templates";
import type { BookSettings, BookTheme, PageKind, TextRole } from "../types";
import { FORMAT_KEYS, FORMAT_SIZES, formatFor, type FormatKey } from "../units";
import { spineWidthMm } from "../pdf";
import { TemplatePreview } from "./template-preview";
import type { BookStudioApi } from "./use-book-studio";

const TEXT_ROLES: { role: TextRole; label: string }[] = [
  { role: "title", label: "Title" },
  { role: "subtitle", label: "Subtitle" },
  { role: "heading", label: "Heading" },
  { role: "body", label: "Paragraph" },
  { role: "caption", label: "Caption" },
  { role: "quote", label: "Quote" },
  { role: "label", label: "Label" },
  { role: "meta", label: "Location or date" },
];

// -- Templates -------------------------------------------------------------------------------------

export function TemplatesPanel({ studio }: { studio: BookStudioApi }) {
  const [category, setCategory] = useState<TemplateCategory>("photobook");
  const [pending, setPending] = useState<string | null>(null);
  const list = TEMPLATES.filter((t) => t.category === category);
  const sample = studio.brief.sources.length > 0 ? studio.brief : null;
  return (
    <div>
      <Section title="Start a new book from a template">
        <Segmented
          label="Category"
          value={category}
          columns={3}
          options={(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map((c) => ({ value: c, label: { photobook: "Photo books", magazine: "Magazines", print: "Print" }[c] }))}
          onChange={setCategory}
        />
        <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[category].blurb} Starting a new book keeps this one saved, so you can come back to it from Projects.</p>
        <ul className="space-y-3">
          {list.map((t) => (
            <li key={t.key} className={cn("rounded-lg border p-3 transition-colors", studio.project.templateKey === t.key ? "border-primary bg-primary/5" : "border-border bg-card")}>
              <TemplatePreview template={t} brief={sample ?? studio.brief} height={110} />
              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.format === "custom" ? "Custom size" : FORMAT_SIZES[t.format].label} · {t.blurb}
                  </p>
                </div>
                <Button size="xs" variant={pending === t.key ? "default" : "secondary"} disabled={pending !== null && pending !== t.key} onClick={async () => {
                  setPending(t.key);
                  await studio.startFromTemplate(t.key);
                  setPending(null);
                }}>
                  {pending === t.key ? "Building…" : "Use"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// -- Pages ----------------------------------------------------------------------------------------------

const KIND_LABEL: Record<PageKind, string> = {
  cover: "Front cover", title: "Title page", dedication: "Dedication", contents: "Contents", intro: "Introduction", chapter: "Chapter divider",
  content: "Content", quote: "Quote", closing: "Closing page", back: "Back cover", blank: "Blank page",
};

export function PagesPanel({ studio }: { studio: BookStudioApi }) {
  const { project, page } = studio;
  const sections = [...new Set(project.pages.map((p) => p.section).filter(Boolean))];
  const [newSection, setNewSection] = useState("");
  return (
    <div>
      <Section title="This page">
        {page ? (
          <>
            <NativeSelect label="Page type" value={page.kind} options={(Object.keys(KIND_LABEL) as PageKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} onChange={(kind) => studio.setPageProps(page.id, (p) => ({ ...p, kind }))} />
            <NativeSelect
              label="Section"
              value={page.section || ""}
              options={[{ value: "", label: "No section" }, ...sections.map((s) => ({ value: s, label: s }))]}
              onChange={(section) => studio.setPageProps(page.id, (p) => ({ ...p, section }))}
            />
            <div className="flex gap-2">
              <input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="New section name"
                aria-label="New section name"
                maxLength={40}
                className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-muted px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              />
              <Button size="sm" variant="secondary" disabled={!newSection.trim()} onClick={() => {
                studio.setPageProps(page.id, (p) => ({ ...p, section: newSection.trim() }));
                setNewSection("");
              }}>
                Move here
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => studio.duplicatePageById(page.id)}>
                <Copy data-icon="inline-start" /> Duplicate
              </Button>
              <Button size="sm" variant="secondary" onClick={() => studio.resetPage(page.id)} disabled={!page.layoutKey}>
                Reset to layout
              </Button>
            </div>
          </>
        ) : null}
      </Section>
      <Section title={`All pages · ${project.pages.length}`}>
        <ol className="space-y-1">
          {project.pages.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={p.id === page?.id}
                onClick={() => studio.selectElement(p.id, null)}
                className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50", p.id === page?.id ? "border-primary bg-primary/10" : "border-transparent bg-muted hover:bg-accent")}
              >
                <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{KIND_LABEL[p.kind]}</span>
                {p.section ? <span className="truncate text-xs text-muted-foreground">{p.section}</span> : null}
              </button>
            </li>
          ))}
        </ol>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => studio.addPageAfter("photo-only")}>
            <Plus data-icon="inline-start" /> Add page
          </Button>
          <Button size="sm" variant="ghost" onClick={studio.rebuildContents}>
            Update contents
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Drag thumbnails in the page strip below to reorder. You don&apos;t need to fill every page: blank pages are fine.</p>
      </Section>
    </div>
  );
}

// -- Uploads and photos -------------------------------------------------------------------------------------

function PhotoGrid({ studio, items }: { studio: BookStudioApi; items: typeof studio.sources }) {
  const used = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of studio.project.pages) {
      for (const e of p.elements) if (e.type === "image" && e.sourceId) map.set(e.sourceId, (map.get(e.sourceId) ?? 0) + 1);
    }
    return map;
  }, [studio.project.pages]);
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-3 gap-2">
      {items.map((s) => {
        const url = studio.images.previewUrl(s.id, 320);
        const count = used.get(s.id) ?? 0;
        return (
          <li key={s.id} className="group relative">
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-tms-source", s.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => studio.placeSource(s.id)}
              aria-label={`Place ${s.name} on the page`}
              title={`${s.name}. Click to place, or drag onto a page.`}
              className="relative block aspect-square w-full overflow-hidden rounded-lg border border-input bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- generated object URLs
                <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />
              ) : (
                <Skeleton className="absolute inset-0 rounded-none" />
              )}
              {count > 0 ? <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 text-[0.65rem] text-white">{count === 1 ? "used" : `used ×${count}`}</span> : null}
              {studio.images.errorFor(s.id) ? <span className="absolute inset-x-0 bottom-0 bg-destructive/90 px-1 text-[0.6rem] text-white">Couldn&apos;t load</span> : null}
            </button>
            {s.local ? (
              <button type="button" aria-label={`Remove ${s.name} from this book's uploads`} onClick={() => studio.removeLocalSource(s.id)} className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/70 text-white opacity-0 outline-none group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring">
                <Trash2 className="size-3" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function UploadsPanel({ studio }: { studio: BookStudioApi }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div>
      <Section title="Add photos from your device">
        <input ref={input} type="file" multiple accept={PICKER_ACCEPT} className="sr-only" aria-label="Choose photos" onChange={(e) => {
          void studio.addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }} />
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
          className={cn("rounded-xl border border-dashed p-4 text-center transition-colors", over ? "border-primary bg-primary/10" : "border-input")}
        >
          <Button variant="secondary" onClick={() => input.current?.click()} disabled={studio.importing}>
            <Upload data-icon="inline-start" /> {studio.importing ? "Adding…" : "Choose photos"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">or drop several here. Your originals stay on this device, in this browser, and are never uploaded.</p>
        </div>
        <PhotoGrid studio={studio} items={studio.localSources} />
        {studio.localSources.length === 0 ? <p className="text-sm text-muted-foreground">Photos you add appear here, ready to drag onto a page.</p> : null}
        <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">A copy of these photos is kept in this browser so you can reopen and edit the book. Clearing your browser&apos;s site data removes them; a downloaded PDF is unaffected.</p>
      </Section>
    </div>
  );
}

export function PhotosPanel({ studio }: { studio: BookStudioApi }) {
  const [onlyUnused, setOnlyUnused] = useState(false);
  const usedIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of studio.project.pages) for (const e of p.elements) if (e.type === "image" && e.sourceId) set.add(e.sourceId);
    return set;
  }, [studio.project.pages]);
  const items = onlyUnused ? studio.sources.filter((s) => !usedIds.has(s.id)) : studio.sources;
  return (
    <div>
      <Section title={`All photos · ${studio.sources.length}`} action={<label className="flex items-center gap-1.5 text-xs text-muted-foreground">Unused only <Switch checked={onlyUnused} onCheckedChange={setOnlyUnused} aria-label="Show only photos not yet used" /></label>}>
        {studio.sources.length === 0 ? <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">No photos yet. Use the Uploads tab to add some.</p> : <PhotoGrid studio={studio} items={items} />}
        <p className="text-xs text-muted-foreground">Click a photo to put it in the selected frame, or drag it onto any frame on the page. Placing a photo never changes your original memory.</p>
      </Section>
    </div>
  );
}

// -- Text -----------------------------------------------------------------------------------------------------------

const TYPE_SETS: { key: string; name: string; theme: Partial<BookTheme> }[] = [
  { key: "luxury", name: "Luxury magazine", theme: { headingFont: "playfair-display", bodyFont: "lora", labelFont: "dm-sans", headingBold: false, headingItalic: false } },
  { key: "minimal", name: "Minimalist album", theme: { headingFont: "outfit", bodyFont: "dm-sans", labelFont: "dm-sans", headingBold: false, headingItalic: false } },
  { key: "romantic", name: "Romantic travel book", theme: { headingFont: "cormorant-garamond", bodyFont: "lora", labelFont: "josefin-sans", headingBold: false, headingItalic: true } },
  { key: "nature", name: "Nature journal", theme: { headingFont: "fraunces", bodyFont: "source-sans-3", labelFont: "josefin-sans", headingBold: false, headingItalic: false } },
];

export function TextPanel({ studio }: { studio: BookStudioApi }) {
  const { page } = studio;
  const texts = page?.elements.filter((e) => e.type === "text") ?? [];
  return (
    <div>
      <Section title="Add text to this page">
        <div className="grid grid-cols-2 gap-2">
          {TEXT_ROLES.map(({ role, label }) => (
            <Button key={role} variant="secondary" size="sm" className="justify-start" onClick={() => studio.addText(role)}>
              <Type data-icon="inline-start" /> {label}
            </Button>
          ))}
        </div>
      </Section>
      <Section title="On this page">
        {texts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No text on this page yet.</p>
        ) : (
          <ul className="space-y-1">
            {texts.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => studio.selectElement(page!.id, t.id)} aria-pressed={studio.selection.elementId === t.id} className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50", studio.selection.elementId === t.id ? "border-primary bg-primary/10" : "border-transparent bg-muted hover:bg-accent")}>
                  <span className="shrink-0 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">{t.type === "text" ? (t.field === "pageNumber" ? "No." : t.role) : ""}</span>
                  <span className="min-w-0 flex-1 truncate">{t.type === "text" ? t.text || "(empty)" : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Typography sets">
        <p className="text-xs text-muted-foreground">Change the fonts across the whole book in one step. Colours stay as they are.</p>
        <div className="grid gap-2">
          {TYPE_SETS.map((s) => (
            <Button key={s.key} variant="outline" size="sm" className="justify-between" onClick={() => studio.setTheme({ ...studio.project.theme, ...s.theme, key: studio.project.theme.key, name: studio.project.theme.name })}>
              {s.name}
              <span className="text-xs text-muted-foreground">{FAMILIES[s.theme.headingFont!].label}</span>
            </Button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// -- Backgrounds ------------------------------------------------------------------------------------------------------

export function BackgroundsPanel({ studio }: { studio: BookStudioApi }) {
  const { page, project } = studio;
  if (!page) return null;
  const t = project.theme;
  const swatches = [t.paper, "#ffffff", "#f5efe6", "#e9eef0", t.accent2, t.accent, t.ink];
  const setBg = (patch: Partial<typeof page.background>, all = false) =>
    all ? studio.update((p) => ({ ...p, pages: p.pages.map((pg) => (pg.kind === "cover" || pg.kind === "back" ? pg : { ...pg, background: { ...pg.background, ...patch } })), updatedAt: Date.now() })) : studio.setPageProps(page.id, (p) => ({ ...p, background: { ...p.background, ...patch } }));
  return (
    <div>
      <Section title="Page colour">
        <div className="flex flex-wrap gap-2">
          {swatches.map((c, i) => (
            <button key={`${c}${i}`} type="button" aria-label={`Use ${c}`} aria-pressed={page.background.color.toLowerCase() === c.toLowerCase()} onClick={() => setBg({ color: c })} className="size-9 rounded-full border border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/60 aria-pressed:ring-2 aria-pressed:ring-primary" style={{ backgroundColor: c }} />
          ))}
          <input type="color" aria-label="Custom page colour" value={page.background.color} onChange={(e) => setBg({ color: e.target.value })} className="size-9 cursor-pointer rounded-full border border-border bg-transparent p-0" />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setBg({ color: page.background.color }, true)}>
          Use this colour on every inner page
        </Button>
      </Section>
      <Section title="Pattern">
        <Segmented label="Decoration" value={page.background.pattern} columns={2} options={[{ value: "none", label: "None" }, { value: "frame", label: "Frame" }, { value: "lines", label: "Ruled lines" }, { value: "dots", label: "Dots" }]} onChange={(pattern) => setBg({ pattern })} />
      </Section>
      <Section title="Photo background">
        <p className="text-xs text-muted-foreground">A photo behind everything on this page. It fills the whole page, so some edges may be cropped.</p>
        <div className="flex gap-2">
          {page.background.imageId ? (
            <Button size="sm" variant="ghost" onClick={() => setBg({ imageId: null })}>
              Remove photo background
            </Button>
          ) : null}
        </div>
        <ul className="grid grid-cols-4 gap-1.5">
          {studio.sources.slice(0, 24).map((s) => {
            const url = studio.images.previewUrl(s.id, 320);
            return (
              <li key={s.id}>
                <button type="button" aria-label={`Use ${s.name} as the page background`} aria-pressed={page.background.imageId === s.id} onClick={() => setBg({ imageId: s.id })} className="relative block aspect-square w-full overflow-hidden rounded-md border border-input bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/60 aria-pressed:ring-2 aria-pressed:ring-primary">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- generated object URLs
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

// -- Shapes -----------------------------------------------------------------------------------------------------------------

export function ShapesPanel({ studio }: { studio: BookStudioApi }) {
  return (
    <div>
      <Section title="Shapes and decoration">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["rect", "Rectangle", Square],
              ["ellipse", "Circle", Circle],
              ["line", "Line", Minus],
            ] as const
          ).map(([shape, label, Icon]) => (
            <button key={shape} type="button" onClick={() => studio.addShape(shape)} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-input bg-muted text-xs outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50">
              <Icon aria-hidden className="size-5" /> {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Shapes stay inside the page. Use them for dividers, colour blocks behind text, or frames. Change the colour and size in the properties panel.</p>
      </Section>
    </div>
  );
}

// -- Layouts -------------------------------------------------------------------------------------------------------------------

function LayoutSchematic({ studio, layoutKey }: { studio: BookStudioApi; layoutKey: string }) {
  const layout = LAYOUTS.find((l) => l.key === layoutKey)!;
  const ctx = layoutCtx(studio.project.theme, studio.project.settings);
  const res = layout.build(ctx);
  const s = studio.project.settings;
  return (
    <svg viewBox={`0 0 ${s.widthMm} ${s.heightMm}`} className="w-full rounded-sm bg-white ring-1 ring-border" aria-hidden>
      {res.background ? <rect width={s.widthMm} height={s.heightMm} fill="#d4d0c8" /> : null}
      {res.slots.map((slot, i) =>
        slot.kind === "image" ? (
          <rect key={i} x={slot.frame.x} y={slot.frame.y} width={slot.frame.w} height={slot.frame.h} fill="#9aa8b4" />
        ) : slot.kind === "text" ? (
          <g key={i} fill="#555">
            {Array.from({ length: Math.max(1, Math.min(6, Math.round(slot.frame.h / (slot.role === "title" ? 10 : 5)))) }, (_, k) => (
              <rect key={k} x={slot.frame.x} y={slot.frame.y + k * (slot.role === "title" ? 9 : 5)} width={slot.frame.w * (k % 2 ? 0.75 : 1) * (slot.role === "title" ? 0.8 : 0.95)} height={slot.role === "title" ? 4 : 1.6} />
            ))}
          </g>
        ) : (
          <rect key={i} x={slot.frame.x} y={slot.frame.y} width={Math.max(slot.frame.w, 0.5)} height={Math.max(slot.frame.h, 0.5)} fill="#bbb" opacity={0.7} />
        ),
      )}
    </svg>
  );
}

export function LayoutsPanel({ studio }: { studio: BookStudioApi }) {
  const { page } = studio;
  if (!page) return null;
  const groups = (Object.keys(GROUP_LABELS) as LayoutGroup[]).map((g) => ({ g, items: LAYOUTS.filter((l) => l.group === g) }));
  return (
    <div>
      {groups.map(({ g, items }) => (
        <Section key={g} title={GROUP_LABELS[g]}>
          <ul className="grid grid-cols-3 gap-2">
            {items.map((l) => (
              <li key={l.key}>
                <button type="button" aria-pressed={page.layoutKey === l.key} title={l.description} onClick={() => studio.changeLayout(page.id, l.key)} className={cn("w-full rounded-lg border p-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", page.layoutKey === l.key ? "border-primary bg-primary/10" : "border-input bg-muted hover:bg-accent")}>
                  <LayoutSchematic studio={studio} layoutKey={l.key} />
                  <span className="mt-1 block text-[0.65rem] leading-tight">{l.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ))}
      <p className="px-4 pb-4 text-xs text-muted-foreground">Changing a layout keeps your photos and words. If something doesn&apos;t fit, it waits in the page&apos;s &ldquo;Not placed&rdquo; list instead of disappearing.</p>
    </div>
  );
}

// -- Themes ----------------------------------------------------------------------------------------------------------------------------

export function ThemesPanel({ studio }: { studio: BookStudioApi }) {
  const themes: BookTheme[] = [destinationTheme({ theme: studio.brief.theme, destinationName: studio.brief.destinationName }), ...Object.values(THEMES)];
  const current = studio.project.theme.key;
  return (
    <div>
      <Section title="Colours and themes">
        <p className="text-xs text-muted-foreground">A theme sets the fonts and colours of the whole book. Your photos and words stay exactly as they are.</p>
        <ul className="space-y-2">
          {themes.map((t) => (
            <li key={t.key}>
              <button type="button" aria-pressed={current === t.key} onClick={() => studio.changeTheme(t.key)} className={cn("flex w-full items-center gap-3 rounded-xl border p-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", current === t.key ? "border-primary bg-primary/10" : "border-input bg-muted hover:bg-accent")}>
                <span className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-black/10" aria-hidden>
                  {[t.paper, t.ink, t.accent, t.accent2].map((c, i) => (
                    <span key={i} className="block h-9 w-5" style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {FAMILIES[t.headingFont].label} · {FAMILIES[t.bodyFont].label}
                  </span>
                </span>
                {current === t.key ? <Check aria-hidden className="size-4 text-primary" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// -- Print settings -----------------------------------------------------------------------------------------------------------------

export function PrintPanel({ studio }: { studio: BookStudioApi }) {
  const { project } = studio;
  const s = project.settings;
  const set = (patch: Partial<BookSettings>) => studio.changeSettings(patch);
  const chooseFormat = (key: FormatKey) => {
    const f = formatFor(key, { widthMm: s.widthMm, heightMm: s.heightMm });
    set({ format: key, widthMm: f.widthMm, heightMm: f.heightMm });
  };
  const spine = spineWidthMm(project);
  const odd = project.pages.length % 2 === 1;
  return (
    <div>
      <Section title="Page size">
        <NativeSelect label="Format" value={s.format} options={FORMAT_KEYS.map((k) => ({ value: k, label: k === "custom" ? "Custom size" : FORMAT_SIZES[k].label }))} onChange={chooseFormat} />
        {s.format === "custom" ? (
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Width" value={s.widthMm} min={50} max={500} format={(v) => `${v} mm`} onChange={(widthMm) => set({ widthMm })} />
            <Slider label="Height" value={s.heightMm} min={50} max={500} format={(v) => `${v} mm`} onChange={(heightMm) => set({ heightMm })} />
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">Changing the size re-flows every page, keeping photos and words. Positions you moved by hand on layout pages are reset.</p>
      </Section>
      <Section title="Bleed, margins and safe area">
        <Slider label="Bleed" value={s.bleedMm} min={0} max={10} step={0.5} format={(v) => `${v} mm`} onChange={(bleedMm) => set({ bleedMm })} />
        <Slider label="Page margin" value={s.marginMm} min={5} max={30} step={0.5} format={(v) => `${v} mm`} onChange={(marginMm) => set({ marginMm })} />
        <Slider label="Print-safe distance" value={s.safeMm} min={3} max={20} step={0.5} format={(v) => `${v} mm`} onChange={(safeMm) => set({ safeMm })} />
        <p className="text-xs text-muted-foreground">3 mm of bleed is a common starting point, but printers differ. Use the figures from your printer&apos;s template, and keep important text inside the safe area.</p>
      </Section>
      <Section title="Options">
        <label className="flex items-center justify-between gap-3 text-sm">
          Page numbers
          <Switch checked={s.showFolios} onCheckedChange={(showFolios) => set({ showFolios })} aria-label="Show page numbers" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          Crop marks in the PDF
          <Switch checked={s.cropMarks} onCheckedChange={(cropMarks) => { set({ cropMarks }); studio.setExportOptions({ cropMarks }); }} aria-label="Add crop marks to the PDF" />
        </label>
        <Slider label="Paper thickness (for the spine)" value={s.paperMm} min={0.05} max={0.3} step={0.01} format={(v) => `${v.toFixed(2)} mm`} onChange={(paperMm) => set({ paperMm })} />
      </Section>
      <Section title="Your book">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Pages</dt>
          <dd className="text-right tabular-nums">{project.pages.length}</dd>
          <dt className="text-muted-foreground">Trim size</dt>
          <dd className="text-right tabular-nums">{s.widthMm} × {s.heightMm} mm</dd>
          <dt className="text-muted-foreground">With bleed</dt>
          <dd className="text-right tabular-nums">{s.widthMm + 2 * s.bleedMm} × {s.heightMm + 2 * s.bleedMm} mm</dd>
          <dt className="text-muted-foreground">Open spread</dt>
          <dd className="text-right tabular-nums">{s.widthMm * 2} × {s.heightMm} mm</dd>
          <dt className="text-muted-foreground">Estimated spine</dt>
          <dd className="text-right tabular-nums">{spine} mm</dd>
        </dl>
        {odd ? <p className="rounded-lg bg-warning/15 p-3 text-xs text-warning">Printed books use pages in pairs. This book has an odd number of pages, so add or remove one.</p> : null}
        <p className="text-xs text-muted-foreground">Colours are written as RGB. Your printer will convert them, so expect slight changes, especially with vivid greens and blues. Follow your printer&apos;s own PDF requirements.</p>
      </Section>
    </div>
  );
}

export { Field, ImagePlus };
