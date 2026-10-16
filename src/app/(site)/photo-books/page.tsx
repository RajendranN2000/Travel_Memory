import { ArrowRight, BookOpen, Crop, Lock, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { Button } from "@/components/ui/button";
import { sampleBookBrief } from "@/features/book/brief";
import { CATEGORY_LABELS, TEMPLATES, type TemplateCategory } from "@/features/book/templates";
import { FORMAT_SIZES } from "@/features/book/units";
import { TemplatePreview } from "@/features/book/ui/template-preview";

export const metadata: Metadata = {
  title: "Photo books and magazines",
  description: "Design a photo book or travel magazine from your trip, then download a print-ready PDF. Made in your browser, never uploaded.",
};

const POINTS = [
  { icon: Crop, title: "Photos are never cut by accident", body: "Every photo stays inside its frame and its page. Cropping only happens when you choose it, and you can see and change it." },
  { icon: Printer, title: "A real, print-ready PDF", body: "Exact page sizes, bleed and crop marks, real text and photos at up to 300 DPI. Not a screenshot." },
  { icon: Lock, title: "Made on your device", body: "Your photos and the finished PDF stay in your browser. Nothing is uploaded." },
];

export default function PhotoBooksPage() {
  const brief = sampleBookBrief();
  const categories = Object.keys(CATEGORY_LABELS) as TemplateCategory[];
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <PageIntro
        eyebrow="Photo books and magazines"
        title="Turn your trip into a book"
        actions={
          <Button asChild size="lg">
            <Link href="/photo-books/start">
              <BookOpen data-icon="inline-start" /> Start a book
            </Link>
          </Button>
        }
      >
        Choose a design, add your photos and memories, and download a print-ready PDF. Photo books, travel magazines and plain print layouts, all editable page by page.
      </PageIntro>

      <ul className="grid gap-4 md:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-lg border border-border bg-card p-5">
            <Icon aria-hidden className="size-5 text-brand" />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>

      {categories.map((category) => (
        <section key={category} aria-labelledby={`cat-${category}`} className="mt-16">
          <h2 id={`cat-${category}`} className="font-display text-3xl">
            {CATEGORY_LABELS[category].label}
          </h2>
          <p className="mt-1 text-muted-foreground">{CATEGORY_LABELS[category].blurb} Previews use sample photos.</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.filter((t) => t.category === category).map((t) => (
              <li key={t.key} className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-soft">
                <div className="rounded-md bg-secondary/50 px-3 pt-6 pb-4">
                  <TemplatePreview template={t} brief={brief} height={190} />
                </div>
                <h3 className="mt-4 font-display text-xl">{t.name}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{t.blurb}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t.format === "custom" ? "Custom size" : FORMAT_SIZES[t.format].label}</p>
                <Link href={`/photo-books/start?template=${t.key}`} className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-brand hover:underline">
                  Create this book <ArrowRight aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-16 text-sm text-muted-foreground">
        Every printer has its own rules for bleed, marks and colour. Set the page size and bleed in the editor to match your printer&apos;s template, and check their PDF requirements before you order.
      </p>
    </div>
  );
}
