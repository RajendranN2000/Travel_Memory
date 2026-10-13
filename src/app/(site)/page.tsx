import { ArrowRight, Link2, Lock, MapPinOff, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { DestinationCard } from "@/components/memory/destination-card";
import { TemplateThumbnail } from "@/components/memory/template-thumbnail";
import { Button } from "@/components/ui/button";
import { getSampleMemory, sampleMemories } from "@/features/memories/samples";
import { templates } from "@/features/templates/registry";
import { MemoryRenderer } from "@/features/templates/render";
import { getDestinationImage } from "@/features/themes/images";
import { listDestinationThemes } from "@/features/themes/registry";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Destinations />
      <TemplateGallery />
      <HowItWorks />
      <SampleMemory />
      <Privacy />
      <FinalCta />
    </>
  );
}

function Hero() {
  const hero = getDestinationImage("munnar/hero");
  const card = getDestinationImage("goa/hero");
  return (
    <section className="relative isolate overflow-hidden bg-ink text-paper">
      {hero ? (
        <Image
          src={hero.src}
          alt={hero.alt}
          fill
          priority
          sizes="100vw"
          placeholder={hero.blurDataURL ? "blur" : "empty"}
          blurDataURL={hero.blurDataURL}
          className="-z-10 object-cover treat-mist"
        />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/35 to-black/10 lg:bg-gradient-to-r lg:from-black/75 lg:via-black/35 lg:to-transparent" />

      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-h-[60rem] max-w-7xl items-end gap-10 px-4 pt-28 pb-12 sm:px-6 sm:pb-16 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:px-8">
        <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
          <p className="eyebrow text-paper/80">My Travel Memory</p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,7.5vw,5.25rem)] leading-[0.98] font-medium tracking-tight">
            Your trips deserve more than a camera roll.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/85 sm:text-xl">
            Turn your travel photos into a personal memory page, styled after the place you visited. Add your words,
            arrange your favourite shots and share it with the people who were there.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-paper text-ink hover:bg-paper/90">
              <Link href="/create">
                Create your memory <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-paper/40 bg-transparent text-paper hover:bg-paper/10 hover:text-paper"
            >
              <Link href="/destinations">Explore destinations</Link>
            </Button>
          </div>
          {hero?.source ? (
            <p className="mt-10 text-xs text-paper/60">
              Munnar tea estates · photo by {hero.source.author}, {hero.source.license}
            </p>
          ) : null}
        </div>

        {card ? (
          <div className="relative hidden justify-self-end lg:block" aria-hidden>
            <div className="w-[21rem] rotate-[2.5deg] rounded-sm bg-[#fff8f0] p-3 pb-6 text-[#2a1a14] shadow-print transition-transform duration-500 hover:rotate-0">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image src={card.src} alt="" fill sizes="336px" className="object-cover treat-golden" />
              </div>
              <p className="mt-4 font-[family-name:var(--font-dm-serif)] text-2xl leading-tight">Salt, sun and the slowest week of the year</p>
              <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-[#6a4a3a] uppercase">Goa · 27 Dec – 2 Jan</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow text-brand">{eyebrow}</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight">{title}</h2>
        {children ? <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Destinations() {
  const themes = listDestinationThemes();
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <Reveal>
        <SectionHeading
          eyebrow="Destination themes"
          title="Every place has its own look"
          action={
            <Button asChild variant="outline">
              <Link href="/destinations">
                All destinations <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          }
        >
          Each theme has its own palette, typography, photo treatment and decorative details, so a monsoon week in
          Wayanad never looks like a beach week in Goa.
        </SectionHeading>
      </Reveal>
      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {themes.map((theme, i) => (
          <Reveal as="li" key={theme.slug} delay={i * 0.06} className={i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}>
            <DestinationCard theme={theme} aspect={i === 0 ? "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[3/4]" : "aspect-[4/3] sm:aspect-[3/4]"} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function TemplateGallery() {
  const previews = [
    { template: "horizon-poster", sample: "sample-goa" },
    { template: "field-journal", sample: "sample-munnar" },
    { template: "contact-sheet", sample: "sample-wayanad" },
    { template: "day-by-day", sample: "sample-ooty" },
  ] as const;
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Templates"
            title="Four ways to tell the story"
            action={
              <Button asChild variant="outline">
                <Link href="/templates">
                  Browse templates <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            }
          >
            Pick a poster, a journal, a collage or a timeline. Each one picks up the colours and type of your
            destination, and you can switch any time.
          </SectionHeading>
        </Reveal>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {previews.map(({ template: slug, sample }, i) => {
            const template = templates.find((t) => t.slug === slug)!;
            const memory = getSampleMemory(sample)!.content;
            return (
              <Reveal as="li" key={slug} delay={i * 0.06}>
                <Link href={`/templates/${slug}`} className="group block rounded-lg focus-visible:outline-offset-4">
                  <TemplateThumbnail
                    memory={{ ...memory, templateSlug: slug, layout: template.layouts[0].key }}
                    className="transition-shadow duration-300 group-hover:shadow-lifted"
                  />
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-xl">{template.name}</h3>
                    <span className="eyebrow text-muted-foreground">{template.family}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{template.summary}</p>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Pick a place",
      body: "Start with the destination. Its theme sets the colours, type and photo treatment for your memory.",
    },
    {
      title: "Choose a template",
      body: "Poster, journal, collage or timeline. Preview each one before you commit, and switch whenever you like.",
    },
    {
      title: "Add photos and words",
      body: "Upload your favourites, drag them into order, and add captions and places. Drafts save as you go.",
    },
    {
      title: "Publish and share",
      body: "Get a link of your own. Keep it private, share it quietly with an unlisted link, or make it public.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <Reveal>
        <SectionHeading eyebrow="How it works" title="From camera roll to keepsake in four steps" />
      </Reveal>
      <ol className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <Reveal as="li" key={step.title} delay={i * 0.08} className="border-t border-foreground/15 pt-6">
            <span className="font-display text-5xl text-brand/90 italic" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-4 text-lg font-semibold">
              <span className="sr-only">Step {i + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function SampleMemory() {
  const sample = getSampleMemory("sample-goa") ?? sampleMemories[0];
  return (
    <section className="bg-ink py-20 text-paper sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:items-center lg:px-8">
        <Reveal>
          <p className="eyebrow text-paper/70">A sample memory</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight">
            What a published memory looks like
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-paper/75">
            This sample uses the Goa theme with the Horizon Poster template. Published memories work on any screen
            and load quickly, and each one gets its own link.
          </p>
          <p className="mt-3 text-sm text-paper/60">
            Sample content made with licensed destination photography. It isn&apos;t a real customer&apos;s trip.
          </p>
          <Button asChild size="lg" className="mt-8 bg-paper text-ink hover:bg-paper/90">
            <Link href={`/memory/${sample.slug}`}>
              Open the sample memory <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-lg border border-paper/15 bg-paper/5 shadow-lifted">
            <div className="flex items-center gap-1.5 border-b border-paper/10 px-4 py-3" aria-hidden>
              <span className="size-2.5 rounded-full bg-paper/25" />
              <span className="size-2.5 rounded-full bg-paper/25" />
              <span className="size-2.5 rounded-full bg-paper/25" />
              <span className="ml-3 truncate rounded bg-paper/10 px-3 py-1 text-xs text-paper/60">
                /memory/{sample.slug}
              </span>
            </div>
            <div className="relative h-[30rem] overflow-hidden sm:h-[34rem]" aria-hidden inert>
              <div className="pointer-events-none">
                <MemoryRenderer memory={sample.content} sizesHint="preview" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Privacy() {
  const points = [
    {
      icon: Lock,
      title: "Drafts are yours alone",
      body: "Unpublished trips and photos are stored privately and are only visible to you while signed in.",
    },
    {
      icon: Link2,
      title: "You choose who sees it",
      body: "Public pages can be found and indexed if you allow it. Unlisted pages open only with the link. Private pages are for you.",
    },
    {
      icon: MapPinOff,
      title: "No hidden location data",
      body: "Photos are re-encoded in your browser before upload, which removes embedded GPS and camera details.",
    },
    {
      icon: Trash2,
      title: "Delete whenever you want",
      body: "Unpublish a memory, remove a photo or delete your account. Deleted photos are removed from storage.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
        <Reveal>
          <SectionHeading eyebrow="Privacy" title="Your memories, on your terms">
            Travel photos are personal. We collect only what&apos;s needed to make your memory pages, and you decide
            what anyone else gets to see.
          </SectionHeading>
          <Link href="/privacy" className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-medium text-brand hover:underline">
            Read the privacy notice <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2">
          {points.map(({ icon: Icon, title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 0.06} className="rounded-lg border border-border bg-card p-6">
              <Icon aria-hidden className="size-5 text-brand" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  const image = getDestinationImage("manali/alpenglow");
  return (
    <section className="relative isolate overflow-hidden">
      {image ? (
        <Image src={image.src} alt="" fill sizes="100vw" className="-z-10 object-cover treat-alpine" />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-black/55" />
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center text-paper sm:py-32">
        <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight">
          Where did you go last?
        </h2>
        <p className="mt-4 max-w-xl text-lg text-paper/85">
          Start a draft in a minute. Nothing is shared until you choose to publish.
        </p>
        <Button asChild size="lg" className="mt-8 bg-paper text-ink hover:bg-paper/90">
          <Link href="/create">
            Create your memory <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
