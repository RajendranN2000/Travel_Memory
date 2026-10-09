import { cn } from "@/lib/utils";
import type { MemoryPhoto } from "@/features/memories/types";
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

type Block =
  | { kind: "wide"; photos: [MemoryPhoto]; start: number }
  | { kind: "pair"; photos: [MemoryPhoto, MemoryPhoto]; start: number }
  | { kind: "quote"; photos: [MemoryPhoto]; start: number };

/** Groups photos into a repeating editorial rhythm: wide, pair, quote. */
export function journalBlocks(photos: MemoryPhoto[]): Block[] {
  const blocks: Block[] = [];
  const rhythm: Block["kind"][] = ["wide", "pair", "quote", "pair"];
  let i = 0;
  let step = 0;
  while (i < photos.length) {
    const kind = rhythm[step % rhythm.length];
    const remaining = photos.length - i;
    if (kind === "pair" && remaining >= 2) {
      blocks.push({ kind, photos: [photos[i], photos[i + 1]], start: i });
      i += 2;
    } else if (kind === "quote" && photos[i].caption) {
      blocks.push({ kind, photos: [photos[i]], start: i });
      i += 1;
    } else {
      blocks.push({ kind: "wide", photos: [photos[i]], start: i });
      i += 1;
    }
    step += 1;
  }
  return blocks;
}

export function FieldJournal(props: TemplateProps) {
  return props.layout === "wide" ? <WideJournal {...props} /> : <ClassicJournal {...props} />;
}

function JournalHeader({ memory, resolved, centered = false }: TemplateProps & { centered?: boolean }) {
  const heading = headingClass(resolved.theme);
  const dates = memoryDates(memory);
  return (
    <header className={cn("max-w-3xl", centered && "mx-auto text-center")}>
      <p className="eyebrow text-th-accent">{resolved.theme.copy.journalOpening}</p>
      <h1 className={cn(heading, "mt-4 text-[clamp(2.2rem,7cqi,4.75rem)] leading-[1.02] text-th-primary")}>
        {memory.title || "Untitled trip"}
      </h1>
      {memory.description ? (
        <p
          className={cn(
            "mt-6 text-lg leading-relaxed text-th-ink @2xl:text-xl",
            !centered &&
              "first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-th-heading first-letter:text-[3.6em] first-letter:leading-[0.8] first-letter:text-th-primary",
          )}
        >
          {memory.description}
        </p>
      ) : null}
      <dl
        className={cn(
          "mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-th-line py-4 text-sm",
          centered && "justify-center",
        )}
      >
        <div>
          <dt className="eyebrow text-th-muted">Where</dt>
          <dd className="mt-1 font-medium">{[resolved.theme.name, resolved.theme.region].filter(Boolean).join(", ")}</dd>
        </div>
        {dates ? (
          <div>
            <dt className="eyebrow text-th-muted">When</dt>
            <dd className="mt-1 font-medium">{dates}</dd>
          </div>
        ) : null}
        <div>
          <dt className="eyebrow text-th-muted">Photographs</dt>
          <dd className="mt-1 font-medium">{memory.photos.length}</dd>
        </div>
      </dl>
    </header>
  );
}

function ClassicJournal(props: TemplateProps) {
  const { memory, resolved, priority, sizesHint } = props;
  const heading = headingClass(resolved.theme);
  const blocks = journalBlocks(memory.photos);

  return (
    <TemplateFrame resolved={resolved}>
      <article className="mx-auto max-w-6xl px-5 py-10 @2xl:px-10 @2xl:py-16">
        <JournalHeader {...props} />

        {memory.photos.length === 0 ? <TemplateEmptyState resolved={resolved} className="mt-10" /> : null}

        <div className="mt-10 space-y-12 @2xl:mt-14 @2xl:space-y-16">
          {blocks.map((block, b) => {
            if (block.kind === "pair") {
              return (
                <div key={block.start} className="grid gap-8 @xl:grid-cols-2 @xl:gap-6">
                  {block.photos.map((photo, j) => (
                    <figure key={photo.id} className={cn(j === 1 && "@xl:mt-16")}>
                      <div className="relative aspect-[4/5] overflow-hidden rounded-th bg-th-secondary">
                        <PhotoFill
                          photo={photo}
                          alt={photoAlt(photo, memory, block.start + j)}
                          resolved={resolved}
                          sizes={imageSizes(sizesHint, "tile")}
                        />
                      </div>
                      <Caption photo={photo} />
                    </figure>
                  ))}
                </div>
              );
            }
            if (block.kind === "quote") {
              const [photo] = block.photos;
              return (
                <figure key={block.start} className="grid items-center gap-6 @3xl:grid-cols-[1.4fr_1fr] @3xl:gap-12">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-th bg-th-secondary">
                    <PhotoFill
                      photo={photo}
                      alt={photoAlt(photo, memory, block.start)}
                      resolved={resolved}
                      sizes={imageSizes(sizesHint, "cover")}
                    />
                  </div>
                  <figcaption>
                    <ThemeDecoration theme={resolved.theme} className="w-20 text-th-accent" />
                    <blockquote className={cn(heading, "mt-4 text-[clamp(1.4rem,3.6cqi,2.2rem)] leading-snug text-th-primary")}>
                      “{photo.caption}”
                    </blockquote>
                    {photo.location ? <p className="eyebrow mt-4 text-th-muted">{photo.location}</p> : null}
                  </figcaption>
                </figure>
              );
            }
            const [photo] = block.photos;
            return (
              <figure key={block.start}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-th bg-th-secondary @2xl:aspect-[16/9]">
                  <PhotoFill
                    photo={photo}
                    alt={photoAlt(photo, memory, block.start)}
                    resolved={resolved}
                    sizes={imageSizes(sizesHint, "cover")}
                    priority={priority && b === 0}
                  />
                </div>
                <Caption photo={photo} className="max-w-2xl" />
              </figure>
            );
          })}
        </div>
      </article>
      <SignOff resolved={resolved} />
    </TemplateFrame>
  );
}

function WideJournal(props: TemplateProps) {
  const { memory, resolved, priority, sizesHint } = props;
  const heading = headingClass(resolved.theme);

  return (
    <TemplateFrame resolved={resolved}>
      <article>
        <div className="px-5 pt-12 pb-10 @2xl:px-10 @2xl:pt-20">
          <JournalHeader {...props} centered />
        </div>

        {memory.photos.length === 0 ? (
          <div className="px-5 @2xl:px-10">
            <TemplateEmptyState resolved={resolved} className="mx-auto max-w-4xl" />
          </div>
        ) : null}

        {memory.photos.map((photo, i) => (
          <section key={photo.id} aria-label={photo.caption || `Photo ${i + 1}`}>
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden bg-th-secondary @xl:aspect-[3/2] @5xl:aspect-[21/9]">
                <PhotoFill
                  photo={photo}
                  alt={photoAlt(photo, memory, i)}
                  resolved={resolved}
                  sizes={imageSizes(sizesHint, "cover")}
                  priority={priority && i === 0}
                />
              </div>
              {photo.caption || photo.location ? (
                <figcaption className="mx-auto max-w-2xl px-6 py-10 text-center @2xl:py-14">
                  {photo.caption ? (
                    <p className={cn(heading, "text-[clamp(1.25rem,3cqi,1.9rem)] leading-snug text-th-ink")}>{photo.caption}</p>
                  ) : null}
                  {photo.location ? <p className="eyebrow mt-3 text-th-muted">{photo.location}</p> : null}
                </figcaption>
              ) : (
                <div className="h-6" />
              )}
            </figure>
          </section>
        ))}
      </article>
      <SignOff resolved={resolved} />
    </TemplateFrame>
  );
}
