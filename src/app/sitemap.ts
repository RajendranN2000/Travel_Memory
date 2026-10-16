import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticPaths = ["", "/destinations", "/templates", "/reels", "/credits"];
  const memories = await indexableMemories();
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path}` })),
    ...listDestinationThemes().map((t) => ({ url: `${base}/destinations/${t.slug}` })),
    ...templates.map((t) => ({ url: `${base}/templates/${t.slug}` })),
    ...memories.map((m) => ({ url: `${base}/memory/${m.slug}`, lastModified: m.updated_at })),
  ];
}
