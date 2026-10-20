import { BookOpen, Crop, Lock, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { Button } from "@/components/ui/button";
import { sampleBookBrief } from "@/features/book/brief";
import { BookGallery } from "./book-gallery";

export const metadata: Metadata = {
  alternates: { canonical: "/photo-books" },
  title: "Photo books and magazines",
  description: "Design a photo book or travel magazine from your trip, then download a print-ready PDF. Made in your browser, never uploaded.",
};

const TONES = ["from-[#ff7a59] to-[#f2a93b]", "from-[#7c5cff] to-[#c084fc]", "from-[#10b981] to-[#22d3ee]"] as const;

const POINTS = [
  { icon: Crop, title: "Photos are never cut by accident", body: "Every photo stays inside its frame and its page. Cropping only happens when you choose it, and you can see and change it." },
  { icon: Printer, title: "A real, print-ready PDF", body: "Exact page sizes, bleed and crop marks, real text and photos at up to 300 DPI. Not a screenshot." },
  { icon: Lock, title: "Made on your device", body: "Your photos and the finished PDF stay in your browser. Nothing is uploaded." },
];

export default function PhotoBooksPage() {
  const brief = sampleBookBrief();
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
        {POINTS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="card-glow group rounded-2xl border border-border bg-card p-6">
            <span className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${TONES[i]} text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}>
              <Icon aria-hidden className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>

      <BookGallery brief={brief} />

      <p className="mt-16 text-sm text-muted-foreground">
        Every printer has its own rules for bleed, marks and colour. Set the page size and bleed in the editor to match your printer&apos;s template, and check their PDF requirements before you order.
      </p>
    </div>
  );
}
