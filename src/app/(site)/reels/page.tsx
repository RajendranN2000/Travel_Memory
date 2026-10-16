import { Clapperboard, FileText, Images, Lock, Music2, Smartphone, Type, Wand2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ReelShowcase } from "@/components/memory/reel-showcase";
import { Reveal } from "@/components/motion/reveal";
import { PageIntro } from "@/components/site/page-intro";
import { Button } from "@/components/ui/button";
import { ASPECT_INFO } from "@/features/reel/config";
import { PRESETS } from "@/features/reel/presets";
import { ASPECTS } from "@/features/reel/types";

export const metadata: Metadata = {
  title: "Reels",
  description: "Turn your travel photos into a cinematic reel with music, text and transitions. Made in your browser, never uploaded.",
};

const STEPS = [
  { icon: FileText, title: "Choose a template", body: "Pick a destination and template. The reel borrows its colours, type and mood." },
  { icon: Images, title: "Give us the details", body: "Add your photos, a title, dates and a few words or places for each photo." },
  { icon: Wand2, title: "Create the reel", body: "One click builds a polished draft. Adjust timing, motion, text, music and look if you like." },
  { icon: Clapperboard, title: "Download and share", body: "Render it in your browser and download an MP4 for Instagram, TikTok or Shorts." },
];

const INPUTS = [
  { icon: Images, title: "Photos", body: "From your memory, or add more from your device. Reorder, repeat or drop any of them." },
  { icon: Type, title: "Words", body: "Your title, dates, locations and captions become animated text on the reel." },
  { icon: Music2, title: "Music (optional)", body: "Import a song you have the right to use. Trim it, fade it and cut on the beat." },
];

export default function ReelsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
        <PageIntro
          eyebrow="Reels"
          title="Turn your trip into a reel"
          actions={
            <>
              <Button asChild size="lg">
                <Link href="/create?intent=reel">
                  <Clapperboard data-icon="inline-start" /> Start a reel
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/my-memories?tab=reels">My reels</Link>
              </Button>
            </>
          }
          className="md:flex-col md:items-start"
        >
          Give us your photos and a few words and we&apos;ll make a cinematic video with motion, transitions, text and music, using the colours and type of your destination.
        </PageIntro>
        <Reveal>
          <ReelShowcase />
        </Reveal>
      </div>

      <section aria-labelledby="how" className="mt-8">
        <h2 id="how" className="font-display text-3xl">
          How it works
        </h2>
        <ol className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="border-t border-foreground/15 pt-5">
              <span className="font-display text-4xl text-brand/90 italic" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 flex items-center gap-2 font-semibold">
                <Icon aria-hidden className="size-4 text-brand" />
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="inputs" className="mt-20 rounded-lg border border-border bg-secondary/40 p-6 sm:p-10">
        <h2 id="inputs" className="font-display text-3xl">
          What you bring
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">You add these in the editor, the same place you build your memory page. Nothing else is needed.</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          {INPUTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-lg border border-border bg-card p-5">
              <Icon aria-hidden className="size-5 text-brand" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-20 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="styles">
          <h2 id="styles" className="font-display text-3xl">
            Six ready-made styles
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <li key={p.key} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <span aria-hidden className="size-11 shrink-0 rounded-md" style={{ background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1]})` }} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="shapes">
          <h2 id="shapes" className="font-display text-3xl">
            Every shape and size
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {ASPECTS.map((a) => (
              <li key={a} className="rounded-lg border border-border bg-card p-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Smartphone aria-hidden className="size-4 text-brand" /> {ASPECT_INFO[a].label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{ASPECT_INFO[a].use}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">720p or 1080p at 24, 30 or 60 frames per second. MP4 where your browser can make it, WebM otherwise.</p>
        </section>
      </div>

      <section aria-labelledby="privacy" className="mt-20 flex flex-col gap-4 rounded-lg bg-ink p-6 text-paper sm:p-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 id="privacy" className="flex items-center gap-2 font-display text-2xl">
            <Lock aria-hidden className="size-5" /> Made on your device
          </h2>
          <p className="mt-2 text-paper/75">
            Photos, music and the finished video are processed in your browser. Nothing is uploaded, and rendering takes about as long as the video itself. Only use music you have the right to use.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0 bg-paper text-ink hover:bg-paper/90">
          <Link href="/create?intent=reel">Create your first reel</Link>
        </Button>
      </section>
    </div>
  );
}
