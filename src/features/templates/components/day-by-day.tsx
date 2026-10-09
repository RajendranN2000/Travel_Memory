import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseIsoDate } from "@/lib/dates";
import type { MemoryContent, MemoryPhoto } from "@/features/memories/types";
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

export interface TimelineGroup {
  key: string;
  label: string;
  sublabel: string;
  entries: Array<{ photo: MemoryPhoto; index: number }>;
}

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/**
 * Groups photos by the date the user set on them. Dated groups are ordered
 * chronologically and labelled relative to the trip start; undated photos are
 * kept in their original order at the end.
 */
export function timelineGroups(memory: Pick<MemoryContent, "photos" | "startDate">): TimelineGroup[] {
  const start = parseIsoDate(memory.startDate);
  const dated = new Map<string, TimelineGroup>();
  const undated: TimelineGroup = { key: "undated", label: "More moments", sublabel: "", entries: [] };

  memory.photos.forEach((photo, index) => {
    const date = parseIsoDate(photo.takenOn);
    if (!date || !photo.takenOn) {
      undated.entries.push({ photo, index });
      return;
    }
    let group = dated.get(photo.takenOn);
    if (!group) {
      const dayNumber = start ? Math.round((date.getTime() - start.getTime()) / 86_400_000) + 1 : null;
      group = {
        key: photo.takenOn,
        label: dayNumber && dayNumber > 0 ? `Day ${dayNumber}` : weekday.format(date).split(" ")[0],
        sublabel: weekday.format(date),
        entries: [],
      };
      dated.set(photo.takenOn, group);
    }
    group.entries.push({ photo, index });
  });

  const groups = [...dated.values()].sort((a, b) => a.key.localeCompare(b.key));
  if (undated.entries.length > 0) {
    if (groups.length === 0) undated.label = "Moments";
    groups.push(undated);
  }
  return groups;
}

export function DayByDay(props: TemplateProps) {
  const { memory, resolved, priority, sizesHint, layout } = props;
  const heading = headingClass(resolved.theme);
  const dates = memoryDates(memory);
  const alternating = layout === "alternating";
  const groups = timelineGroups(memory);
  const order = new Map(groups.flatMap((g) => g.entries).map((e, i) => [e.photo.id, i]));

  return (
    <TemplateFrame resolved={resolved}>
      <article className="mx-auto max-w-6xl px-5 py-10 @2xl:px-10 @2xl:py-16">
        <header className={cn("max-w-3xl", alternating && "@3xl:mx-auto @3xl:text-center")}>
          <p className="eyebrow text-th-accent">{resolved.theme.copy.timelineLabel}</p>
          <h1 className={cn(heading, "mt-3 text-[clamp(2.1rem,7cqi,4.5rem)] leading-[1.02] text-th-primary")}>
            {memory.title || "Untitled trip"}
          </h1>
          {dates ? <p className="mt-4 text-sm font-semibold tracking-wide">{dates}</p> : null}
          {memory.description ? <p className="mt-4 text-lg leading-relaxed text-th-muted">{memory.description}</p> : null}
          <ThemeDecoration
            theme={resolved.theme}
            className={cn("mt-6 w-28 text-th-accent", alternating && "@3xl:mx-auto")}
          />
        </header>

        {memory.photos.length === 0 ? (
          <TemplateEmptyState resolved={resolved} className="mt-10" />
        ) : (
          <ol
            className={cn(
              "relative mt-12 space-y-14 before:absolute before:top-2 before:bottom-2 before:left-[0.4375rem] before:w-px before:bg-th-line",
              alternating && "@3xl:before:left-1/2",
            )}
          >
            {groups.map((group) => (
              <li key={group.key} className="relative">
                <div className={cn("relative pl-10", alternating && "@3xl:pl-0 @3xl:text-center")}>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-1.5 left-0 size-3.5 rounded-full border-2 border-th-bg bg-th-primary ring-1 ring-th-primary",
                      alternating && "@3xl:left-1/2 @3xl:-translate-x-1/2",
                    )}
                  />
                  <h2
                    className={cn(
                      heading,
                      "text-2xl text-th-primary @2xl:text-3xl",
                      alternating && "@3xl:inline-block @3xl:bg-th-bg @3xl:px-4 @3xl:pt-6",
                    )}
                  >
                    {group.label}
                  </h2>
                  {group.sublabel ? <p className="mt-1 text-sm text-th-muted">{group.sublabel}</p> : null}
                </div>

                <ul className="mt-6 space-y-10">
                  {group.entries.map(({ photo, index }) => {
                    const side = (order.get(photo.id) ?? 0) % 2 === 0 ? "left" : "right";
                    return (
                      <li
                        key={photo.id}
                        className={cn(
                          "pl-10",
                          alternating &&
                            (side === "left"
                              ? "@3xl:w-1/2 @3xl:pr-12 @3xl:pl-0"
                              : "@3xl:ml-auto @3xl:w-1/2 @3xl:pl-12"),
                        )}
                      >
                        <figure className="overflow-hidden rounded-th border border-th-line bg-th-surface">
                          <div className="relative aspect-[3/2] bg-th-secondary">
                            <PhotoFill
                              photo={photo}
                              alt={photoAlt(photo, memory, index)}
                              resolved={resolved}
                              sizes={imageSizes(sizesHint, alternating ? "tile" : "cover")}
                              priority={priority && index === 0}
                            />
                          </div>
                          {photo.caption || photo.location ? (
                            <figcaption className="space-y-2 p-4 @2xl:p-5">
                              {photo.caption ? <p className="leading-relaxed">{photo.caption}</p> : null}
                              {photo.location ? (
                                <p className="flex items-center gap-1.5 text-sm text-th-muted">
                                  <MapPin aria-hidden className="size-3.5 shrink-0" />
                                  {photo.location}
                                </p>
                              ) : null}
                            </figcaption>
                          ) : null}
                        </figure>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </article>
      <SignOff resolved={resolved} />
    </TemplateFrame>
  );
}
