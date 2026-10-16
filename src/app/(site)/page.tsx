import { ArrowRight, BookOpen, Clapperboard, Crop, Link2, Lock, MapPinOff, Music2, Printer, Smartphone, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { DestinationCard } from "@/components/memory/destination-card";
import { ReelShowcase } from "@/components/memory/reel-showcase";
import { sampleBookBrief } from "@/features/book/brief";
import { getTemplate } from "@/features/book/templates";
import { TemplatePreview } from "@/features/book/ui/template-preview";
import { SampleDevices } from "@/components/memory/sample-devices";
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
      <Reels />
      <PhotoBooks />
      <HowItWorks />
      <SampleMemory />
      <Privacy />
      <FinalCta />
    </>
  );
}

function Hero() {
  const hero = getDestinationImage("manali/hero");
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
          className="-z-10 scale-105 object-cover treat-alpine"
        />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-black/45" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/50 to-black/30 lg:bg-gradient-to-r lg:from-black/85 lg:via-black/55 lg:to-black/25" />

      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-10 px-4 pt-24 pb-14 sm:px-6 sm:pb-16 lg:grid-cols-[1.15fr_1fr] lg:px-8">
        <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
          <p className="inline-flex items-center gap-2 rounded-full border border-paper/25 bg-paper/10 px-3.5 py-1.5 text-xs font-semibold tracking-[0.16em] text-paper/90 uppercase backdrop-blur-md">
            <span aria-hidden className="size-1.5 rounded-full bg-brand" /> Memory pages · Reels
          </p>
          <h1 className="mt-6 font-display text-[clamp(2.5rem,6.2vw,4.75rem)] leading-[1] font-medium tracking-tight text-balance">
            Your trips deserve more than a <span className="italic text-paper/95 underline decoration-brand decoration-[0.06em] underline-offset-[0.12em]">camera roll.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/85 sm:text-xl">
            Turn your travel photos into a memory page styled after the place you visited, or a cinematic reel with music, ready for Instagram. Your words, your favourite shots, shared with the people who were there.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-paper text-ink hover:bg-paper/90">
              <Link href="/create">
                Create your memory <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-paper/40 bg-paper/5 text-paper backdrop-blur-sm hover:bg-paper/15 hover:text-paper">
              <Link href="/create?intent=reel">
                <Clapperboard data-icon="inline-start" /> Make a reel
              </Link>
            </Button>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-paper/80">
            {["5 destination themes", "4 templates", "Reels made in your browser"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-brand" /> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden h-[34rem] lg:block" aria-hidden>
          {card ? (
            <div className="absolute top-14 left-0 w-[15.5rem] -rotate-[6deg] rounded-sm bg-[#fff8f0] p-2.5 pb-5 text-[#2a1a14] shadow-print transition-transform duration-500 hover:rotate-0">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image src={card.src} alt="" fill sizes="248px" className="object-cover treat-golden" />
              </div>
              <p className="mt-3 font-[family-name:var(--font-dm-serif)] text-lg leading-tight">Salt, sun and the slowest week of the year</p>
              <p className="mt-1.5 text-[0.65rem] font-semibold tracking-[0.16em] text-[#6a4a3a] uppercase">Goa · 27 Dec – 2 Jan</p>
            </div>
          ) : null}
          <div className="absolute top-0 right-2 rotate-[3deg]">
            <ReelShowcase className="mx-0 w-[15rem]" />
          </div>
        </div>
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

function Reels() {
  const points = [
    { icon: Sparkles, title: "One click to a polished draft", body: "Your photos, title and captions become a cinematic reel with motion, transitions and a film look." },
    { icon: Music2, title: "Your music, your timing", body: "Import a song, trim it, fade it, and cut the photos on the beat." },
    { icon: Smartphone, title: "Made for every screen", body: "9:16 for Reels and Shorts, 4:5 for the feed, plus square and landscape, up to 1080p." },
    { icon: Lock, title: "Made in your browser", body: "Photos, music and the finished video never leave your device. Nothing is uploaded." },
  ];
  const strip = ["munnar/valley", "goa/shore", "manali/alpenglow", "wayanad/falls", "ooty/fog-road"]
    .map((key) => getDestinationImage(key))
    .filter((img): img is NonNullable<typeof img> => Boolean(img));
  const chip = "absolute hidden items-center gap-2 rounded-full border border-paper/15 bg-ink/80 px-3.5 py-2 text-sm font-medium text-paper shadow-lifted backdrop-blur sm:flex";
  return (
    <section className="relative isolate overflow-hidden bg-ink text-paper">
      <div aria-hidden className="pointer-events-none absolute -right-32 -bottom-40 -z-10 size-[30rem] rounded-full bg-primary/40 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:px-8">
        <Reveal className="order-2 lg:order-1">
          <div className="relative mx-auto max-w-md rounded-[2rem] border border-paper/10 bg-gradient-to-br from-paper/10 via-paper/5 to-transparent px-6 pt-12 pb-8 sm:px-10">
            <ReelShowcase />
            <span className={`${chip} top-10 -left-4 lg:-left-8`}>
              <Smartphone aria-hidden className="size-4 text-paper" /> 9:16 · 1080p
            </span>
            <span className={`${chip} top-1/3 -right-4 lg:-right-8`}>
              <Music2 aria-hidden className="size-4 text-paper" /> Your music
            </span>
            <span className={`${chip} bottom-32 -left-4 lg:-left-8`}>
              <Sparkles aria-hidden className="size-4 text-paper" /> Cinematic Travel
            </span>
            <div className="mt-8 rounded-xl border border-paper/10 bg-paper/5 p-2.5" aria-hidden>
              <div className="relative flex gap-1">
                {strip.map((img, i) => (
                  <div key={img.src} className="relative h-10 flex-1 overflow-hidden rounded-md">
                    <Image src={img.src} alt="" fill sizes="80px" className={i % 2 ? "object-cover treat-golden" : "object-cover treat-mist"} />
                  </div>
                ))}
                <span className="absolute -top-1 -bottom-1 left-[38%] w-0.5 rounded bg-brand" />
              </div>
              <p className="mt-2 flex items-center justify-between px-1 text-[0.7rem] text-paper/60">
                <span>Drag to reorder, trim and time every photo</span>
                <span className="tabular-nums">0:15</span>
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="order-1 lg:order-2">
          <p className="eyebrow flex items-center gap-2 text-paper/70">
            Reels
            <span className="rounded-full bg-brand px-2 py-0.5 text-[0.62rem] tracking-wider text-white">New</span>
          </p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight">Turn your trip into a reel</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-paper/75">
            Pick a template, add your photos and a few words, and press Create Reel. Fine-tune the timing, text, music and look, then download a video ready for Instagram, TikTok or YouTube Shorts.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {points.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-lg border border-paper/10 bg-paper/5 p-5 transition-colors hover:bg-paper/10">
                <span className="grid size-10 place-items-center rounded-md bg-paper/10 text-paper">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-paper/70">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-paper text-ink hover:bg-paper/90">
              <Link href="/create?intent=reel">
                <Clapperboard data-icon="inline-start" /> Create a reel
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-paper/40 bg-transparent text-paper hover:bg-paper/10 hover:text-paper">
              <Link href="/reels">
                See how reels work <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PhotoBooks() {
  const brief = sampleBookBrief("sample-goa");
  const picks = ["travel-memories", "editorial-magazine", "minimalist-album"].map((k) => getTemplate(k)!);
  const points = [
    { icon: Crop, title: "Photos are never cut by accident", body: "Every photo stays whole inside its frame, and cropping only happens when you choose it." },
    { icon: Printer, title: "A real print-ready PDF", body: "Exact page sizes, bleed and crop marks, with real text and photos at up to 300 DPI." },
  ];
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:px-8">
        <Reveal className="min-w-0">
          <div className="min-w-0 space-y-6">
            {picks.map((t, i) => (
              <div key={t.key} className={i === 1 ? "min-w-0 lg:ml-10" : i === 2 ? "min-w-0 lg:ml-4" : "min-w-0"}>
                <TemplatePreview template={t} brief={brief} height={150} className="rounded-lg bg-card px-4 pt-5 pb-3 shadow-soft ring-1 ring-border" />
                <p className="mt-2 px-1 text-sm font-medium">{t.name}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.08} className="min-w-0">
          <p className="eyebrow flex items-center gap-2 text-brand">
            Photo books
            <span className="rounded-full bg-brand px-2 py-0.5 text-[0.62rem] tracking-wider text-white">New</span>
          </p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight">Print your trip as a book or magazine</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Choose a design, drop in your photos and memories, adjust every page, and download a print-ready PDF. Photo books, travel magazines and simple print layouts, all made in your browser.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {points.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-lg border border-border bg-card p-5">
                <span className="grid size-10 place-items-center rounded-md bg-brand/10 text-brand">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/photo-books/start">
                <BookOpen data-icon="inline-start" /> Create a photo book
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/photo-books">
                Browse designs <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </Reveal>
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
    {
      title: "Make a reel",
      body: "Turn the same photos and words into a cinematic video with music, then download it for Instagram or Shorts.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <Reveal>
        <SectionHeading eyebrow="How it works" title="From camera roll to keepsake in five steps" />
      </Reveal>
      <ol className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
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
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:items-center lg:px-8">
        <Reveal className="min-w-0">
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
        <Reveal delay={0.1} className="min-w-0">
          <SampleDevices
            slug={sample.slug}
            desktop={<MemoryRenderer memory={sample.content} sizesHint="preview" />}
            mobile={<MemoryRenderer memory={sample.content} sizesHint="preview" />}
          />
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
      body: "Unpublished trips and photos are stored privately and are only visible to you while signed in. Reels and music are made in your browser and never uploaded.",
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
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="bg-paper text-ink hover:bg-paper/90">
            <Link href="/create">
              Create your memory <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-paper/40 bg-transparent text-paper hover:bg-paper/10 hover:text-paper">
            <Link href="/create?intent=reel">
              <Clapperboard data-icon="inline-start" /> Make a reel
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
