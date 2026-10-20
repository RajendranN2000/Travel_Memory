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
  alternates: { canonical: "/reels" },
  title: "Reels",
  description: "Turn your travel photos into a cinematic reel with music, text and transitions. Made in your browser, never uploaded.",
};

const TONES = [
  { grad: "from-[#ff7a59] to-[#f2a93b]", soft: "from-[#ff7a59]/12 to-[#f2a93b]/5", ring: "hover:border-[#ff7a59]/60", glow: "hover:shadow-[0_18px_40px_-18px_rgba(255,122,89,0.6)]" },
  { grad: "from-[#7c5cff] to-[#c084fc]", soft: "from-[#7c5cff]/12 to-[#c084fc]/5", ring: "hover:border-[#7c5cff]/60", glow: "hover:shadow-[0_18px_40px_-18px_rgba(124,92,255,0.6)]" },
  { grad: "from-[#10b981] to-[#22d3ee]", soft: "from-[#10b981]/12 to-[#22d3ee]/5", ring: "hover:border-[#10b981]/60", glow: "hover:shadow-[0_18px_40px_-18px_rgba(16,185,129,0.6)]" },
  { grad: "from-[#ec4899] to-[#f43f5e]", soft: "from-[#ec4899]/12 to-[#f43f5e]/5", ring: "hover:border-[#ec4899]/60", glow: "hover:shadow-[0_18px_40px_-18px_rgba(236,72,153,0.6)]" },
] as const;

const STATS = [
  { value: "9:16", label: "Reels, Stories, Shorts" },
  { value: "1080p", label: "Up to 60 fps" },
  { value: "MP4", label: "Ready to post" },
  { value: "0", label: "Photos uploaded" },
];

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
      <div className="relative mt-4 overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-[#fff1e6] via-[#fde7f3] to-[#e6ecff] px-6 sm:px-10 lg:px-14 dark:from-[#2b1d18] dark:via-[#271a2b] dark:to-[#1a2033]">
        <div aria-hidden className="blob-drift pointer-events-none absolute -top-24 -left-20 size-80 rounded-full bg-[#ff7a59]/30 blur-3xl" />
        <div aria-hidden className="blob-drift pointer-events-none absolute -right-16 -bottom-24 size-96 rounded-full bg-[#7c5cff]/25 blur-3xl [animation-delay:3s]" />
        <div className="relative grid items-center gap-8 pb-12 lg:grid-cols-[1.3fr_1fr] lg:pb-4">
          <PageIntro
            eyebrow="Reels"
            title="Turn your trip into a reel"
            actions={
              <>
                <Button asChild size="lg" variant="brand">
                  <Link href="/create?intent=reel">
                    <Clapperboard data-icon="inline-start" /> Start a reel
                  </Link>
                </Button>
                <Button asChild size="lg" variant="glass">
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
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((st, i) => (
          <li key={st.label} className="lift rounded-2xl border border-border bg-card px-4 py-4 text-center">
            <p className={`bg-gradient-to-r ${TONES[i].grad} bg-clip-text font-display text-3xl text-transparent`}>{st.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{st.label}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="how" className="mt-16">
        <p className="eyebrow text-brand">Four easy steps</p>
        <h2 id="how" className="mt-2 font-display text-3xl sm:text-4xl">
          How it works
        </h2>
        <ol className="relative mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => {
            const t = TONES[i % TONES.length];
            return (
              <li key={title} className={`group lift relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${t.soft} p-6 transition-all duration-300 ${t.ring} ${t.glow}`}>
                <span aria-hidden className="pointer-events-none absolute -top-3 right-3 font-display text-7xl font-semibold text-foreground/[0.07] transition-transform duration-500 group-hover:scale-110">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${t.grad} text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}>
                  <Icon aria-hidden className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="inputs" className="mt-16 rounded-3xl border border-border bg-gradient-to-br from-[#fff7ec] to-[#f1ecff] p-6 sm:p-10 dark:from-[#241f19] dark:to-[#1f1c2b]">
        <h2 id="inputs" className="font-display text-3xl">
          What you bring
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">You add these in the editor, the same place you build your memory page. Nothing else is needed.</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          {INPUTS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="lift rounded-2xl border border-border bg-card p-5">
              <span className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br ${TONES[i].grad} text-white`}>
                <Icon aria-hidden className="size-5" />
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="styles">
          <h2 id="styles" className="font-display text-3xl">
            Six ready-made styles
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <li key={p.key} className="lift flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <span aria-hidden className="size-11 shrink-0 rounded-xl shadow-sm" style={{ background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1]})` }} />
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
              <li key={a} className="lift rounded-2xl border border-border bg-card p-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#ff7a59] to-[#f2a93b] text-white">
                    <Smartphone aria-hidden className="size-4" />
                  </span> {ASPECT_INFO[a].label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{ASPECT_INFO[a].use}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">720p or 1080p at 24, 30 or 60 frames per second. MP4 where your browser can make it, WebM otherwise.</p>
        </section>
      </div>

      <section aria-labelledby="privacy" className="relative mt-16 flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b16] via-[#2a1f3d] to-[#3b1f2b] p-6 text-paper sm:p-10 md:flex-row md:items-center md:justify-between">
        <div aria-hidden className="blob-drift pointer-events-none absolute -top-20 -right-10 size-72 rounded-full bg-[#ff7a59]/30 blur-3xl" />
        <div className="relative max-w-2xl">
          <h2 id="privacy" className="flex items-center gap-2 font-display text-2xl">
            <Lock aria-hidden className="size-5" /> Made on your device
          </h2>
          <p className="mt-2 text-paper/75">
            Photos, music and the finished video are processed in your browser. Nothing is uploaded, and rendering takes about as long as the video itself. Only use music you have the right to use.
          </p>
        </div>
        <Button asChild size="lg" variant="brand" className="relative shrink-0">
          <Link href="/create?intent=reel">
            <Clapperboard data-icon="inline-start" /> Create your first reel
          </Link>
        </Button>
      </section>
    </div>
  );
}
