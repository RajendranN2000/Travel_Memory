import { cn } from "@/lib/utils";
import { headingClass } from "@/features/themes/css";
import { ThemeDecoration } from "@/features/themes/decorations";
import {
  Caption,
  imageSizes,
  memoryDates,
  PhotoFill,
  photoAlt,
  SignOff,
  TemplateEmptyState,
  TemplateFrame,
  type TemplateProps,
} from "./shared";

export function HorizonPoster(props: TemplateProps) {
  return props.layout === "framed" ? <FramedPoster {...props} /> : <FullBleedPoster {...props} />;
}

function FullBleedPoster({ memory, resolved, priority, sizesHint }: TemplateProps) {
  const heading = headingClass(resolved.theme);
  const [cover, ...rest] = memory.photos;
  const dates = memoryDates(memory);

  return (
    <TemplateFrame resolved={resolved}>
      <article>
        <header className="relative isolate flex aspect-[4/5] items-end overflow-hidden @2xl:aspect-[16/9] @5xl:aspect-[21/9]">
          <PhotoFill
            photo={cover}
            alt={cover ? photoAlt(cover, memory, 0) : ""}
            resolved={resolved}
            sizes={imageSizes(sizesHint, "cover")}
            priority={priority}
            className="-z-10"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/25 to-black/5" aria-hidden />
          <div className="w-full p-6 text-white @2xl:p-12 @5xl:p-16">
            <p className="eyebrow text-white/85">{resolved.theme.copy.eyebrow}</p>
            <h1 className={cn(heading, "mt-3 max-w-[16ch] text-[clamp(2.1rem,8.5cqi,6rem)] leading-[0.95]")}>
              {memory.title || "Untitled trip"}
            </h1>
            {dates ? <p className="mt-4 text-sm font-medium text-white/85 @2xl:text-base">{dates}</p> : null}
          </div>
        </header>

        {memory.description ? (
          <section className="mx-auto max-w-3xl px-6 py-12 text-center @2xl:py-20">
            <ThemeDecoration theme={resolved.theme} className="mx-auto w-24 text-th-accent" />
            <p className={cn("mt-6 font-th-heading text-[clamp(1.2rem,3.2cqi,1.85rem)] leading-snug text-th-ink")}>
              {memory.description}
            </p>
          </section>
        ) : (
          <div className="h-10" />
        )}

        {memory.photos.length === 0 ? (
          <div className="px-5 pb-12 @2xl:px-10">
            <TemplateEmptyState resolved={resolved} />
          </div>
        ) : rest.length > 0 ? (
          <section aria-label="Gallery" className="grid grid-cols-1 gap-x-4 gap-y-8 px-4 pb-6 @md:grid-cols-2 @2xl:px-10 @4xl:grid-cols-3">
            {rest.map((photo, i) => (
              <figure key={photo.id} className={cn(i % 5 === 0 && rest.length > 2 ? "@md:col-span-2" : "")}>
                <div
                  className={cn(
                    "relative overflow-hidden rounded-th bg-th-secondary",
                    i % 5 === 0 && rest.length > 2 ? "aspect-[3/2] @4xl:aspect-[16/9]" : "aspect-[4/3]",
                  )}
                >
                  <PhotoFill
                    photo={photo}
                    alt={photoAlt(photo, memory, i + 1)}
                    resolved={resolved}
                    sizes={imageSizes(sizesHint, "tile")}
                  />
                </div>
                <Caption photo={photo} />
              </figure>
            ))}
          </section>
        ) : null}

        <SignOff resolved={resolved} />
      </article>
    </TemplateFrame>
  );
}

function FramedPoster({ memory, resolved, priority, sizesHint }: TemplateProps) {
  const heading = headingClass(resolved.theme);
  const [cover, ...rest] = memory.photos;
  const dates = memoryDates(memory);

  return (
    <TemplateFrame resolved={resolved}>
      <article className="px-4 py-6 @2xl:px-10 @2xl:py-12">
        <div className="mx-auto max-w-6xl rounded-th border border-th-line bg-th-surface p-4 shadow-print @2xl:p-8">
          <div className="grid gap-6 @3xl:grid-cols-[1.15fr_1fr] @3xl:items-stretch @3xl:gap-10">
            <div className="relative aspect-[4/5] overflow-hidden rounded-th bg-th-secondary @3xl:aspect-auto @3xl:min-h-[28rem]">
              <PhotoFill
                photo={cover}
                alt={cover ? photoAlt(cover, memory, 0) : ""}
                resolved={resolved}
                sizes={imageSizes(sizesHint, "cover")}
                priority={priority}
              />
            </div>
            <div className="flex flex-col justify-between gap-8 py-2">
              <div>
                <p className="eyebrow text-th-muted">{resolved.theme.copy.eyebrow}</p>
                <p
                  className={cn(
                    heading,
                    "mt-4 break-words text-[clamp(3rem,13cqi,7.5rem)] leading-[0.85] text-th-primary",
                  )}
                  aria-hidden
                >
                  {resolved.theme.name}
                </p>
                <h1 className={cn(heading, "mt-6 text-[clamp(1.5rem,4cqi,2.4rem)] leading-tight text-th-ink")}>
                  {memory.title || "Untitled trip"}
                </h1>
                {memory.description ? (
                  <p className="mt-4 max-w-prose leading-relaxed text-th-muted">{memory.description}</p>
                ) : null}
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-th-line pt-4">
                <p className="text-sm font-semibold tracking-wide text-th-ink">{dates || "Dates to come"}</p>
                <ThemeDecoration theme={resolved.theme} className="w-28 shrink-0 text-th-accent" />
              </div>
            </div>
          </div>
        </div>

        {memory.photos.length === 0 ? (
          <TemplateEmptyState resolved={resolved} className="mx-auto mt-8 max-w-6xl" />
        ) : rest.length > 0 ? (
          <section aria-label="Gallery" className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-3 @2xl:gap-5 @4xl:grid-cols-4">
            {rest.map((photo, i) => (
              <figure key={photo.id} className="rounded-th border border-th-line bg-th-surface p-2 @2xl:p-3">
                <div className="relative aspect-square overflow-hidden rounded-[calc(var(--t-radius)*0.6)] bg-th-secondary">
                  <PhotoFill
                    photo={photo}
                    alt={photoAlt(photo, memory, i + 1)}
                    resolved={resolved}
                    sizes={imageSizes(sizesHint, "tile")}
                  />
                </div>
                <Caption photo={photo} className="text-xs @2xl:text-sm" />
              </figure>
            ))}
          </section>
        ) : null}

        <SignOff resolved={resolved} className="pb-6" />
      </article>
    </TemplateFrame>
  );
}
