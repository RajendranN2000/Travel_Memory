import { cn } from "@/lib/utils";
import { headingClass } from "@/features/themes/css";
import { ThemeDecoration } from "@/features/themes/decorations";
import {
  imageSizes,
  memoryDates,
  PhotoFill,
  photoAlt,
  SignOff,
  TemplateEmptyState,
  TemplateFrame,
  type TemplateProps,
} from "./shared";

/** Tile spans repeat every 7 photos to give the mosaic an irregular rhythm. */
const MOSAIC_PATTERN = [
  "col-span-2 row-span-2",
  "",
  "row-span-2",
  "",
  "col-span-2",
  "",
  "@2xl:col-span-2",
];

export function ContactSheet(props: TemplateProps) {
  return props.layout === "scrapbook" ? <Scrapbook {...props} /> : <Mosaic {...props} />;
}

function SheetHeader({ memory, resolved }: TemplateProps) {
  const heading = headingClass(resolved.theme);
  const dates = memoryDates(memory);
  return (
    <header className="grid gap-6 @3xl:grid-cols-[1.4fr_1fr] @3xl:items-end">
      <div>
        <p className="eyebrow text-th-accent">{resolved.theme.copy.eyebrow}</p>
        <h1 className={cn(heading, "mt-3 text-[clamp(2rem,6.5cqi,4.25rem)] leading-[1.02] text-th-primary")}>
          {memory.title || "Untitled trip"}
        </h1>
      </div>
      <div className="@3xl:text-right">
        {dates ? <p className="text-sm font-semibold tracking-wide">{dates}</p> : null}
        {memory.description ? <p className="mt-2 leading-relaxed text-th-muted">{memory.description}</p> : null}
      </div>
    </header>
  );
}

function Mosaic(props: TemplateProps) {
  const { memory, resolved, priority, sizesHint } = props;
  return (
    <TemplateFrame resolved={resolved}>
      <article className="mx-auto max-w-7xl px-3 py-8 @2xl:px-8 @2xl:py-14">
        <div className="px-2">
          <SheetHeader {...props} />
        </div>
        {memory.photos.length === 0 ? (
          <TemplateEmptyState resolved={resolved} className="mt-8" />
        ) : (
          <ul
            className="mt-8 grid grid-flow-dense auto-rows-[8.5rem] grid-cols-2 gap-1.5 @md:auto-rows-[10rem] @2xl:auto-rows-[11rem] @2xl:grid-cols-4 @2xl:gap-2 @5xl:auto-rows-[13rem]"
            aria-label="Photo collage"
          >
            {memory.photos.map((photo, i) => (
              <li key={photo.id} className={cn("relative", MOSAIC_PATTERN[i % MOSAIC_PATTERN.length])}>
                <figure className="group relative h-full w-full overflow-hidden rounded-[calc(var(--t-radius)*0.5)] bg-th-secondary">
                  <PhotoFill
                    photo={photo}
                    alt={photoAlt(photo, memory, i)}
                    resolved={resolved}
                    sizes={imageSizes(sizesHint, i === 0 ? "cover" : "tile")}
                    priority={priority && i === 0}
                    className="transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
                  />
                  {photo.caption || photo.location ? (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2.5 text-xs leading-snug text-white @2xl:text-sm">
                      {photo.caption || photo.location}
                    </figcaption>
                  ) : null}
                </figure>
              </li>
            ))}
          </ul>
        )}
      </article>
      <SignOff resolved={resolved} />
    </TemplateFrame>
  );
}

const TILT = ["-rotate-[1.6deg]", "rotate-[1.2deg]", "-rotate-[0.6deg]", "rotate-[2deg]", "rotate-[0.4deg]"];

function Scrapbook(props: TemplateProps) {
  const { memory, resolved, priority, sizesHint } = props;
  return (
    <TemplateFrame resolved={resolved} className="grain">
      <article className="mx-auto max-w-6xl px-5 py-10 @2xl:px-10 @2xl:py-16">
        <SheetHeader {...props} />
        <ThemeDecoration theme={resolved.theme} className="mt-6 w-32 text-th-accent" />
        {memory.photos.length === 0 ? (
          <TemplateEmptyState resolved={resolved} className="mt-8" />
        ) : (
          <ul className="mt-10 columns-1 gap-8 @md:columns-2 @4xl:columns-3" aria-label="Scrapbook">
            {memory.photos.map((photo, i) => (
              <li key={photo.id} className="mb-6 break-inside-avoid px-2 pt-5">
                <figure
                  className={cn(
                    "relative bg-white p-2.5 pb-4 shadow-print transition-transform duration-500 ease-out-soft hover:rotate-0 motion-reduce:transition-none",
                    TILT[i % TILT.length],
                  )}
                >
                  <span
                    aria-hidden
                    className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg] bg-th-accent/35 mix-blend-multiply"
                  />
                  <div
                    className="relative overflow-hidden bg-th-secondary"
                    style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                  >
                    <PhotoFill
                      photo={photo}
                      alt={photoAlt(photo, memory, i)}
                      resolved={resolved}
                      sizes={imageSizes(sizesHint, "tile")}
                      priority={priority && i === 0}
                    />
                  </div>
                  {photo.caption || photo.location ? (
                    <figcaption className="px-1 pt-3 font-th-script text-xl leading-tight text-neutral-800">
                      {photo.caption}
                      {photo.location ? (
                        <span className="mt-1 block font-th-body text-xs tracking-wide text-neutral-600 uppercase">
                          {photo.location}
                        </span>
                      ) : null}
                    </figcaption>
                  ) : null}
                </figure>
              </li>
            ))}
          </ul>
        )}
      </article>
      <SignOff resolved={resolved} />
    </TemplateFrame>
  );
}
