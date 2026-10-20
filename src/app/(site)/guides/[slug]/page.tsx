import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_NAME } from "@/config/seo";
import { getGuide, guides } from "@/features/seo/guides";
import { getSiteUrl } from "@/lib/supabase/env";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found", robots: { index: false } };
  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: { type: "article", title: guide.title, description: guide.description, modifiedTime: guide.updated },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description },
  };
}

export default function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-16 h-96 w-full max-w-3xl" />}>
      <Guide params={params} />
    </Suspense>
  );
}

async function Guide({ params }: Pick<PageProps<"/guides/[slug]">, "params">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const base = getSiteUrl();
  const related = guides.filter((g) => g.slug !== slug).slice(0, 3);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.h1,
            description: guide.description,
            dateModified: guide.updated,
            datePublished: guide.updated,
            mainEntityOfPage: `${base}/guides/${guide.slug}`,
            keywords: guide.keywords.join(", "),
            author: { "@type": "Organization", name: SITE_NAME },
            publisher: { "@type": "Organization", name: SITE_NAME, url: base },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: guide.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: base },
              { "@type": "ListItem", position: 2, name: "Guides", item: `${base}/guides` },
              { "@type": "ListItem", position: 3, name: guide.h1, item: `${base}/guides/${guide.slug}` },
            ],
          },
        ]}
      />
      <nav aria-label="Breadcrumb" className="pt-10 text-sm text-muted-foreground">
        <Link href="/guides" className="hover:text-foreground hover:underline">
          Guides
        </Link>
      </nav>
      <header className="pt-4 pb-8">
        <span className="grid size-12 place-items-center rounded-xl bg-secondary text-brand">
          <guide.icon aria-hidden className="size-6" />
        </span>
        <h1 className="mt-5 font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05]">{guide.h1}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{guide.intro}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Updated <time dateTime={guide.updated}>{new Date(guide.updated).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" })}</time>
        </p>
      </header>

      <div className="space-y-10">
        {guide.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-2xl">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-foreground/85">
                {p}
              </p>
            ))}
            {s.bullets ? (
              <ul className="mt-4 space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3 leading-relaxed text-foreground/85">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <section className="mt-14 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <h2 className="font-display text-2xl">Frequently asked questions</h2>
        <dl className="mt-4 divide-y divide-border">
          {guide.faq.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-1.5 leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <p className="font-display text-xl">Ready to try it with your own photos?</p>
        <Button asChild size="lg" variant="secondary">
          <Link href={guide.cta.href}>
            {guide.cta.label} <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <aside aria-label="More guides" className="mt-14">
        <h2 className="eyebrow text-muted-foreground">More guides</h2>
        <ul className="mt-3 space-y-1">
          {related.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="inline-flex min-h-10 items-center text-foreground/85 hover:text-brand hover:underline">
                {g.h1}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </article>
  );
}
