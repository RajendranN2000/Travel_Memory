import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { PageIntro } from "@/components/site/page-intro";
import { SITE_NAME } from "@/config/seo";
import { guides } from "@/features/seo/guides";
import { getSiteUrl } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Travel photo, reel and photo book guides",
  description:
    "Practical guides for travel photo books, Instagram reels, photo dumps, trip recap videos and digital travel journals, with ideas for Munnar, Goa, Manali, Ooty and Wayanad.",
  keywords: ["travel photo ideas", "travel reel ideas", "photo book ideas", "trip recap video", "digital travel journal"],
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  const base = getSiteUrl();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${SITE_NAME} guides`,
          url: `${base}/guides`,
          hasPart: guides.map((g) => ({ "@type": "Article", headline: g.h1, url: `${base}/guides/${g.slug}` })),
        }}
      />
      <PageIntro eyebrow="Guides" title="Ideas for turning trips into keepsakes">
        Short, practical guides for travel photo books, reels, photo dumps and journals.
      </PageIntro>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g, i) => (
          <Reveal as="li" key={g.slug} delay={i % 3}>
            <Link href={`/guides/${g.slug}`} className="lift group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-brand transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                <g.icon aria-hidden className="size-5" />
              </span>
              <h2 className="mt-5 font-display text-xl leading-snug">{g.h1}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{g.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand">
                Read the guide <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
