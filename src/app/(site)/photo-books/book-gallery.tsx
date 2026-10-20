"use client";

import { ArrowRight, BookOpen, FileText, Newspaper, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, TEMPLATES, type TemplateCategory } from "@/features/book/templates";
import type { BookBrief } from "@/features/book/types";
import { FORMAT_SIZES } from "@/features/book/units";
import { TemplatePreview } from "@/features/book/ui/template-preview";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<TemplateCategory, LucideIcon> = {
  photobook: BookOpen,
  magazine: Newspaper,
  print: FileText,
};

/** One category at a time, chosen from a tab bar, so the page stays short however many designs there are. */
export function BookGallery({ brief }: { brief: BookBrief }) {
  const categories = Object.keys(CATEGORY_LABELS) as TemplateCategory[];
  const [active, setActive] = useState<TemplateCategory>(categories[0]);
  const items = TEMPLATES.filter((t) => t.category === active);

  return (
    <section aria-labelledby="designs" className="mt-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-brand">Pick a design</p>
          <h2 id="designs" className="mt-2 font-display text-3xl sm:text-4xl">
            Start from a template
          </h2>
        </div>
        <div role="tablist" aria-label="Design categories" className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card/80 p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => {
            const Icon = TAB_ICONS[category];
            const selected = category === active;
            const count = TEMPLATES.filter((t) => t.category === category).length;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                id={`tab-${category}`}
                aria-selected={selected}
                aria-controls={`panel-${category}`}
                onClick={() => setActive(category)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "bg-gradient-to-r from-[#d9552b] via-[#e8742f] to-[#f2a93b] text-white shadow-[0_6px_16px_-6px_rgba(217,85,43,0.65)]" : "text-foreground hover:bg-foreground/[0.07]",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {CATEGORY_LABELS[category].label}
                <span className={cn("rounded-full px-1.5 text-xs", selected ? "bg-white/25" : "bg-muted text-muted-foreground")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={active} role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-muted-foreground">{CATEGORY_LABELS[active].blurb} Previews use sample photos.</p>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <li key={t.key} className="card-glow group flex min-w-0 flex-col rounded-3xl border border-border bg-card p-4 shadow-soft">
              <div className="rounded-2xl bg-gradient-to-br from-[#fff1e6] via-[#fde7f3] to-[#e6ecff] px-3 pt-6 pb-4 transition-transform duration-500 group-hover:scale-[1.02] dark:from-[#2b1d18] dark:via-[#271a2b] dark:to-[#1a2033]">
                <TemplatePreview template={t} brief={brief} height={190} />
              </div>
              <h3 className="mt-4 font-display text-xl">{t.name}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{t.blurb}</p>
              <p className="mt-2 w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t.format === "custom" ? "Custom size" : FORMAT_SIZES[t.format].label}</p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={`/photo-books/start?template=${t.key}`}>
                  Create this book <ArrowRight aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
