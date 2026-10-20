import Image from "next/image";
import { getDestinationImage } from "@/features/themes/images";
import { cn } from "@/lib/utils";

const SLIDES = [
  { image: "goa/cove", place: "Goa", line: "Salt, sun and the slowest week", treatment: "treat-vivid" },
  { image: "manali/alpenglow", place: "Manali", line: "Where the mountains turn gold", treatment: "treat-vivid" },
  { image: "goa/palms", place: "Goa", line: "Palms, sand and endless sky", treatment: "treat-vivid" },
  { image: "wayanad/heart-lake", place: "Wayanad", line: "A lake shaped like a heart", treatment: "treat-vivid" },
] as const;

/** A phone showing what a finished reel feels like. Pure CSS, so it costs no JavaScript. */
export function ReelShowcase({ className }: { className?: string }) {
  const firstImage = getDestinationImage(SLIDES[0].image);
  return (
    <div className={cn("relative mx-auto w-[15.5rem] sm:w-[17rem]", className)} role="img" aria-label="A sample reel: travel photos drifting and fading with titles over each one">
      {/* colourful glow behind the phone */}
      <div aria-hidden className="blob-drift absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff7a59_0%,transparent_55%),radial-gradient(circle_at_75%_70%,#7c5cff_0%,transparent_55%),radial-gradient(circle_at_70%_20%,#22d3ee_0%,transparent_50%)] opacity-60 blur-3xl" />
      <span aria-hidden className="float-slow absolute top-10 -left-8 z-10 hidden rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1e1b16] shadow-lg sm:block">🎬 Auto cuts</span>
      <span aria-hidden className="float-slow absolute right-[-1.75rem] bottom-24 z-10 hidden rounded-full bg-gradient-to-r from-[#d9552b] to-[#f2a93b] px-3 py-1.5 text-xs font-semibold text-white shadow-lg [animation-delay:1.5s] sm:block">♪ Music sync</span>
      <div className="rounded-[2.25rem] border border-white/25 bg-black p-2 shadow-lifted ring-4 ring-white/40">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-ink">
          {/* A still frame always sits underneath, so the phone is never empty while the others load. */}
          {firstImage ? <Image src={firstImage.src} alt="" fill sizes="(min-width: 640px) 720px, 640px" quality={85} priority className={cn("object-cover", SLIDES[0].treatment)} /> : null}
          {SLIDES.map((s) => {
            const img = getDestinationImage(s.image);
            return img ? (
              <Image key={s.image} src={img.src} alt="" fill sizes="(min-width: 640px) 720px, 640px" quality={85} loading="eager" fetchPriority="low" className={cn("reel-slide object-cover", s.treatment)} />
            ) : null;
          })}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />
          <div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden>
            {SLIDES.map((s) => (
              <span key={s.image} className="h-0.5 flex-1 rounded bg-white/30" />
            ))}
          </div>
          <div className="reel-progress absolute inset-x-3 top-3 h-0.5 overflow-hidden rounded bg-transparent" aria-hidden>
            <span className="block h-full w-full rounded bg-white" />
          </div>
          <div className="absolute inset-x-4 bottom-12 text-center text-white" aria-hidden>
            {SLIDES.map((s) => (
              <div key={s.image} className="reel-caption absolute inset-x-0 bottom-0">
                <p className="text-[0.6rem] font-semibold tracking-[0.2em] uppercase opacity-80">{s.place}</p>
                <p className="mt-1 font-display text-xl leading-tight">{s.line}</p>
              </div>
            ))}
          </div>
          <p className="absolute inset-x-0 bottom-4 text-center text-[0.6rem] tracking-[0.18em] text-white/70 uppercase" aria-hidden>
            ♪ Made in your browser
          </p>
        </div>
      </div>
    </div>
  );
}
