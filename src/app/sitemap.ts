import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { guides } from "@/features/seo/guides";
import { templates } from "@/features/templates/registry";
import { listDestinationThemes } from "@/features/themes/registry";
import { createAnonClient } from "@/lib/supabase/anon";
import { getSiteUrl } from "@/lib/supabase/env";

/**
 * Only public memories whose owners opted into indexing are listed. Unlisted
 * and private memories never appear here.
 */
async function indexableMemories(): Promise<Array<{ slug: string; updated_at: string }>> {
  "use cache";
  cacheLife("hours");
  const supabase = createAnonClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("published_memories")
    .select("slug, updated_at")
    .eq("visibility", "public")
    .eq("allow_indexing", true)
    .order("updated_at", { ascending: false })
    .limit(5000);
  return data ?? [];
}

type Entry = MetadataRoute.Sitemap[number];

/** Pages are dated by their last meaningful content change, not by build time. */
const SITE_UPDATED = new Date("2026-10-20");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const memories = await indexableMemories();

  const core: Array<[string, number, Entry["changeFrequency"]]> = [
    ["", 1, "weekly"],
    ["/destinations", 0.9, "weekly"],
    ["/templates", 0.9, "weekly"],
    ["/reels", 0.9, "weekly"],
    ["/photo-books", 0.9, "weekly"],
    ["/guides", 0.8, "weekly"],
    ["/feedback", 0.3, "yearly"],
    ["/credits", 0.2, "yearly"],
  ];

  return [
    ...core.map(([path, priority, changeFrequency]) => ({ url: `${base}${path}`, lastModified: SITE_UPDATED, priority, changeFrequency })),
    ...listDestinationThemes().map((t) => ({ url: `${base}/destinations/${t.slug}`, lastModified: SITE_UPDATED, priority: 0.8, changeFrequency: "monthly" as const })),
    ...templates.map((t) => ({ url: `${base}/templates/${t.slug}`, lastModified: SITE_UPDATED, priority: 0.7, changeFrequency: "monthly" as const })),
    ...guides.map((g) => ({ url: `${base}/guides/${g.slug}`, lastModified: new Date(g.updated), priority: 0.8, changeFrequency: "monthly" as const })),
    ...memories.map((m) => ({ url: `${base}/memory/${m.slug}`, lastModified: m.updated_at, priority: 0.5, changeFrequency: "monthly" as const })),
  ];
}
