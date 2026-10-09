"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { DestinationChips } from "@/components/memory/destination-picker";
import { cn } from "@/lib/utils";
import { getTemplate, templates } from "@/features/templates/registry";
import { getDestinationTheme, listDestinationThemes } from "@/features/themes/registry";
import type { DraftFields, SetField } from "../types";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function DesignPanel({ draft, setField }: { draft: DraftFields; setField: SetField }) {
  const destinations = listDestinationThemes().map((t) => ({ slug: t.slug, name: t.name, swatch: t.palettes[0].primary }));
  const theme = getDestinationTheme(draft.destinationSlug);
  const template = getTemplate(draft.templateSlug) ?? templates[0];
  const recommended = theme?.templates[0];

  return (
    <div className="space-y-9">
      <Section title="Destination theme" description="Sets colours, typography and photo treatment.">
        <DestinationChips options={destinations} value={draft.destinationSlug} onChange={(slug) => setField("destinationSlug", slug)} />
      </Section>

      <Section title="Template">
        <div role="group" aria-label="Template" className="grid gap-2">
          {templates.map((t) => {
            const checked = t.slug === draft.templateSlug;
            return (
              <button
                key={t.slug}
                type="button"
                aria-pressed={checked}
                onClick={() => setField("templateSlug", t.slug)}
                className="relative rounded-md border border-border bg-card p-3.5 text-left transition-colors hover:border-foreground/30"
              >
                {checked ? (
                  <motion.span
                    layoutId="template-selected"
                    className="absolute inset-0 rounded-md border-2 border-primary bg-primary/[0.04]"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    aria-hidden
                  />
                ) : null}
                <span className="relative flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  {t.slug === recommended ? <span className="eyebrow text-brand">Suits {theme?.name}</span> : null}
                  {checked ? <Check aria-hidden className="ml-auto size-4 text-primary" /> : null}
                </span>
                <span className="relative mt-0.5 block text-sm text-muted-foreground">{t.bestFor}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Layout">
        <div role="group" aria-label="Layout" className="grid grid-cols-2 gap-2">
          {template.layouts.map((l) => {
            const checked = l.key === draft.layout;
            return (
              <button
                key={l.key}
                type="button"
                aria-pressed={checked}
                onClick={() => setField("layout", l.key)}
                className={cn(
                  "min-h-11 rounded-md border p-3 text-left text-sm transition-colors",
                  checked ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "border-border bg-card hover:border-foreground/30",
                )}
              >
                <span className="block font-medium">{l.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{l.description}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {theme ? (
        <Section title="Colours" description={`Palettes made for ${theme.name}.`}>
          <div role="group" aria-label="Colour palette" className="grid grid-cols-3 gap-2">
            {theme.palettes.map((p, i) => {
              const checked = (draft.palette ?? theme.palettes[0].key) === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => setField("palette", i === 0 ? null : p.key)}
                  className={cn(
                    "overflow-hidden rounded-md border text-left transition-shadow",
                    checked ? "border-primary ring-2 ring-primary" : "border-border hover:shadow-soft",
                  )}
                >
                  <span className="flex h-10" aria-hidden>
                    {[p.bg, p.secondary, p.accent, p.primary].map((c, j) => (
                      <span key={j} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className="block px-2 py-1.5 text-xs font-medium">{p.name}</span>
                </button>
              );
            })}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
