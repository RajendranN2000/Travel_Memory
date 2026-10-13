"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TripSummary } from "@/features/trips/types";
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
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function category(trip: TripSummary): Exclude<Filter, "all"> {
  if (!trip.publication) return "draft";
  if (trip.publication.visibility === "public") return "published";
  return trip.publication.visibility;
}

/** Memory cards grouped into tabs by status: drafts, published, unlisted and private. */
export function TripTabs({ items }: { items: TripItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = new Map<Filter, number>([["all", items.length]]);
  for (const { trip } of items) counts.set(category(trip), (counts.get(category(trip)) ?? 0) + 1);

  const visible = filter === "all" ? items : items.filter(({ trip }) => category(trip) === filter);
  const current = FILTERS.find((f) => f.value === filter)!;

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="gap-6">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList aria-label="Filter memories by status" className="h-auto! w-max gap-1 rounded-xl border border-border bg-card p-1.5 shadow-soft">
          {FILTERS.map((f) => (
            <TabsTrigger
              key={f.value}
              value={f.value}
              className="min-h-10 gap-2 rounded-lg px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              {f.label}
              <span className="rounded-full bg-current/10 px-1.5 text-xs tabular-nums">{counts.get(f.value) ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {visible.length === 0 ? (
        <p role="status" className="rounded-lg border border-dashed border-input px-4 py-10 text-center text-sm text-muted-foreground">
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
