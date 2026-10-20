"use client";

import { BookOpen, Clapperboard } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalBooks } from "@/features/book/use-local-books";
import { useLocalReels } from "@/features/reel/use-local-reels";
import type { TripSummary } from "@/features/trips/types";
import { BooksPanel } from "./books-panel";
import { ReelsPanel } from "./reels-panel";
import { TripCard } from "./trip-card";

export interface TripItem {
  trip: TripSummary;
  destinationName: string;
  swatch: string;
  fallbackImage: string | null;
}

const FILTERS = [
  { value: "all", label: "All", empty: "" },
  { value: "draft", label: "Drafts", empty: "No drafts. Every memory you've started has been published." },
  { value: "published", label: "Published", empty: "Nothing is public yet. Publish a memory and choose Public to see it here." },
  { value: "unlisted", label: "Unlisted", empty: "No unlisted memories. Unlisted pages can only be opened with their link." },
  { value: "private", label: "Private", empty: "No private memories." },
  { value: "reels", label: "Reels", empty: "" },
  { value: "books", label: "Books", empty: "" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];
type Status = Exclude<Filter, "all" | "reels" | "books">;

function category(trip: TripSummary): Status {
  if (!trip.publication) return "draft";
  if (trip.publication.visibility === "public") return "published";
  return trip.publication.visibility;
}

/** Memory cards grouped into tabs by status, plus a Reels tab for videos made from them. */
export function TripTabs({ items }: { items: TripItem[] }) {
  const requested = useSearchParams().get("tab");
  const [filter, setFilter] = useState<Filter>(FILTERS.some((f) => f.value === requested) ? (requested as Filter) : "all");
  const listRef = useRef<HTMLDivElement>(null);
  const reels = useLocalReels();
  const books = useLocalBooks();

  const counts = new Map<Filter, number>([["all", items.length]]);
  for (const { trip } of items) counts.set(category(trip), (counts.get(category(trip)) ?? 0) + 1);
  const known = new Set(items.map((i) => i.trip.id));
  const exportedTrips = new Set(reels.exports.map((e) => e.tripId));
  counts.set("books", books.books.length);
  counts.set("reels", reels.exports.length + reels.drafts.filter((d) => known.has(d.tripId) && !exportedTrips.has(d.tripId)).length);

  // Keep the address in step with the chosen tab, and bring the chosen tab into view on narrow screens.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (filter === "all") url.searchParams.delete("tab");
    else url.searchParams.set("tab", filter);
    window.history.replaceState(window.history.state, "", url);
    listRef.current?.querySelector<HTMLElement>('[data-state="active"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [filter]);

  const visible = filter === "all" ? items : items.filter(({ trip }) => category(trip) === filter);
  const current = FILTERS.find((f) => f.value === filter)!;

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="min-w-0 gap-6">
      <div className="sticky top-[4.25rem] z-30 -mx-4 bg-background/80 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div ref={listRef} className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList aria-label="Filter memories" className="h-auto! w-max gap-1 rounded-full border border-border bg-card p-1.5 shadow-soft">
            {FILTERS.map((f) => (
              <div key={f.value} className="flex items-center gap-1">
                {f.value === "reels" ? <span aria-hidden className="mx-1.5 h-6 w-px bg-border" /> : null}
                <TabsTrigger
                  value={f.value}
                  className="group/tab min-h-10 gap-2 rounded-full px-4 text-sm font-semibold text-foreground transition-all duration-300 hover:bg-foreground/[0.06] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#d9552b] data-[state=active]:via-[#e8742f] data-[state=active]:to-[#f2a93b] data-[state=active]:text-white! data-[state=active]:shadow-[0_6px_16px_-6px_rgba(217,85,43,0.65)] data-[state=active]:hover:bg-transparent"
                >
                  {f.value === "reels" ? <Clapperboard aria-hidden className="size-4" /> : null}
                  {f.value === "books" ? <BookOpen aria-hidden className="size-4" /> : null}
                  {f.label}
                  <span className="rounded-full bg-foreground/10 px-1.5 text-xs tabular-nums group-data-[state=active]/tab:bg-white/25">{counts.get(f.value) ?? 0}</span>
                </TabsTrigger>
              </div>
            ))}
          </TabsList>
        </div>
      </div>

      {filter === "reels" ? (
        <ReelsPanel items={items} reels={reels} />
      ) : filter === "books" ? (
        <BooksPanel items={items} books={books} />
      ) : visible.length === 0 ? (
        <p role="status" className="rounded-3xl border border-dashed border-brand/30 bg-brand/5 px-4 py-14 text-center text-sm text-muted-foreground">
          {current.empty}
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${current.label} memories`}>
          {visible.map((item) => (
            <li key={item.trip.id}>
              <TripCard trip={item.trip} destinationName={item.destinationName} swatch={item.swatch} fallbackImage={item.fallbackImage} />
            </li>
          ))}
        </ul>
      )}
    </Tabs>
  );
}
