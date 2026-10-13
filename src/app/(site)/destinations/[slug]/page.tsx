import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TemplateThumbnail } from "@/components/memory/template-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getSampleForDestination } from "@/features/memories/samples";
import { getTemplate } from "@/features/templates/registry";
import { headingClass, themeStyle, treatmentClass } from "@/features/themes/css";
import { ThemeDecoration } from "@/features/themes/decorations";
import { getDestinationTheme, listDestinationThemes, resolveTheme } from "@/features/themes/registry";

export function generateStaticParams() {
  return listDestinationThemes().map((theme) => ({ slug: theme.slug }));
}

export async function generateMetadata({ params }: PageProps<"/destinations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const theme = getDestinationTheme(slug);
  if (!theme) return { title: "Destination not found" };
  const hero = resolveTheme(slug).hero;
  return {
    title: `${theme.name} trip photo memory ideas`,
    description: `Turn your ${theme.name} trip photos into a shareable memory page. ${theme.copy.summary}`.slice(0, 160),
    alternates: { canonical: `/destinations/${slug}` },
    openGraph: hero ? { images: [{ url: hero.src, width: hero.width, height: hero.height, alt: hero.alt }] } : undefined,
  };
}

export default function DestinationPage({ params }: PageProps<"/destinations/[slug]">) {
  return (
    <Suspense fallback={<DestinationSkeleton />}>
      <Destination params={params} />
    </Suspense>
  );
}

function DestinationSkeleton() {
  return (
    <div aria-busy className="flex flex-col">
      <Skeleton className="h-[70svh] w-full rounded-none" />
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

async function Destination({ params }: Pick<PageProps<"/destinations/[slug]">, "params">) {
  const { slug } = await params;
  const theme = getDestinationTheme(slug);
  if (!theme) notFound();

  const resolved = resolveTheme(slug);
  const heading = headingClass(theme);
  const sample = getSampleForDestination(slug);
  const images = [resolved.hero, ...resolved.gallery].filter((img) => img !== null);

  return (
    <div style={themeStyle(resolved)} className="bg-th-bg font-th-body text-th-ink">
      {/* Hero */}
      <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden text-white">
        {resolved.hero ? (
          <Image
            src={resolved.hero.src}
            alt={resolved.hero.alt}
            fill
            priority
            sizes="100vw"
            placeholder={resolved.hero.blurDataURL ? "blur" : "empty"}
            blurDataURL={resolved.hero.blurDataURL}
            className={cn("-z-10 object-cover", treatmentClass(theme))}
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="mx-auto w-full max-w-7xl px-4 pt-32 pb-14 sm:px-6 lg:px-8">
          <p className="eyebrow text-white/85">{theme.copy.eyebrow}</p>
          <h1 className={cn(heading, "mt-3 text-[clamp(3.5rem,13vw,10rem)] leading-[0.88]")}>{theme.name}</h1>
          <p className="mt-5 max-w-xl text-lg text-white/90 sm:text-xl">{theme.copy.tagline}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-neutral-900 hover:bg-white/90">
              <Link href={`/create?destination=${theme.slug}`}>
                Create a {theme.name} memory <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            {sample ? (
              <Button asChild size="lg" variant="outline" className="border-white/45 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href={`/memory/${sample.slug}`}>See a sample memory</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Identity */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:px-8">
        <div>
          <ThemeDecoration theme={theme} className="w-32 text-th-accent" />
          <h2 className={cn(heading, "mt-6 text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] text-th-primary")}>
            The {theme.name} look
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed">{theme.copy.summary}</p>
        </div>
        <dl className="grid content-start gap-6 rounded-th border border-th-line bg-th-surface p-6 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <dt className="eyebrow text-th-muted">Best season</dt>
            <dd className="mt-1.5 font-medium">{theme.facts.bestSeason}</dd>
          </div>
          {theme.facts.elevation ? (
            <div>
              <dt className="eyebrow text-th-muted">Elevation</dt>
              <dd className="mt-1.5 font-medium">{theme.facts.elevation}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-1">
            <dt className="eyebrow text-th-muted">Known for</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {theme.facts.knownFor.map((item) => (
                <span key={item} className="rounded-full border border-th-line px-3 py-1 text-sm">
                  {item}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      {/* Palettes and type */}
      <section className="border-y border-th-line bg-th-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:px-8">
          <div>
            <h2 className="eyebrow text-th-muted">Palettes</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-3">
              {theme.palettes.map((palette) => (
                <li key={palette.key} className="overflow-hidden rounded-th border border-th-line">
                  <div className="flex h-24" aria-hidden>
                    {[palette.bg, palette.secondary, palette.accent, palette.primary].map((color, i) => (
                      <span key={i} className="flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="p-4" style={{ backgroundColor: palette.bg, color: palette.ink }}>
                    <p className="font-semibold">{palette.name}</p>
                    <p className="mt-1 font-mono text-xs" style={{ color: palette.muted }}>
                      {palette.primary} · {palette.accent}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="eyebrow text-th-muted">Typography</h2>
            <div className="mt-5 rounded-th border border-th-line bg-th-bg p-6">
              <p className={cn(heading, "text-6xl leading-none text-th-primary")} aria-hidden>
                Aa
              </p>
              <p className={cn(heading, "mt-4 text-2xl leading-tight")}>{theme.copy.journalOpening}</p>
              <p className="mt-3 leading-relaxed text-th-muted">
                Body text is set for comfortable reading on small screens, with captions and dates that stay calm
                beside the photographs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Photography */}
      {images.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className={cn(heading, "text-[clamp(1.75rem,3.5vw,2.5rem)] text-th-primary")}>Photography</h2>
          <p className="mt-2 max-w-2xl text-th-muted">
            Photos are shown with this theme&apos;s {theme.imageTreatment.replace("-", " ")} treatment, which is applied to
            your own photos as well.
          </p>
          <ul className={cn("mt-8 grid grid-cols-2 gap-3", images.length - 1 === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
            {images.slice(1).map((img, i) => (
              <li key={img.src} className={cn(i === 0 && images.length - 1 === 3 && "col-span-2 md:col-span-1")}>
                <figure className="h-full">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-th bg-th-secondary">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 768px) 25vw, 50vw"
                      placeholder={img.blurDataURL ? "blur" : "empty"}
                      blurDataURL={img.blurDataURL}
                      className={cn("object-cover", treatmentClass(theme))}
                    />
                  </div>
                  {img.source ? (
                    <figcaption className="mt-1.5 truncate text-xs text-th-muted">
                      {img.source.author} ·{" "}
                      <a href={img.source.url} className="underline underline-offset-2" rel="noopener noreferrer" target="_blank">
                        {img.source.license}
                      </a>
                    </figcaption>
                  ) : null}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Templates */}
      {sample ? (
        <section className="border-t border-th-line">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <h2 className={cn(heading, "text-[clamp(1.75rem,3.5vw,2.5rem)] text-th-primary")}>Templates for {theme.name}</h2>
            <p className="mt-2 max-w-2xl text-th-muted">All four templates take on this theme. We&apos;d start with the first one.</p>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {theme.templates.map((templateSlug, i) => {
                const template = getTemplate(templateSlug);
                if (!template) return null;
                return (
                  <li key={templateSlug}>
                    <Link href={`/templates/${templateSlug}?destination=${theme.slug}`} className="group block rounded-th">
                      <TemplateThumbnail
                        memory={{ ...sample.content, templateSlug, layout: template.layouts[0].key, palette: null }}
                        className="border-th-line transition-shadow group-hover:shadow-lifted"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {i === 0 ? <Badge className="bg-th-primary text-th-on-primary">Recommended</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-th-muted">{template.bestFor}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Button asChild size="lg" className="mt-12 bg-th-primary text-th-on-primary hover:bg-th-primary/90">
              <Link href={`/create?destination=${theme.slug}`}>
                Start a {theme.name} memory <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
