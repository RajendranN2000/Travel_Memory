import "server-only";
import { PHOTO_BUCKET } from "@/features/trips/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonClient } from "@/lib/supabase/anon";

const COVER_URL_TTL = 60 * 60;

export interface DestinationMemory {
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  publishedAt: string;
  rating: number;
  reviewCount: number;
}

/** Public memories published for a destination, best rated first. Empty if none or unavailable. */
export async function listDestinationMemories(destinationSlug: string, limit = 12): Promise<DestinationMemory[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_destination_memories", { p_destination: destinationSlug, p_limit: limit });
  // Quietly show nothing if the migration hasn't been applied yet.
  if (error || !data) return [];

  const paths = data.map((m) => m.cover_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  const admin = paths.length > 0 ? createAdminClient() : null;
  if (admin) {
    const { data: signed } = await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths, COVER_URL_TTL);
    for (const s of signed ?? []) if (s.path && s.signedUrl && !s.error) urls.set(s.path, s.signedUrl);
  }

  return data.map((m) => ({
    slug: m.slug,
    title: m.title,
    description: m.description,
    coverUrl: m.cover_path ? (urls.get(m.cover_path) ?? null) : null,
    publishedAt: m.published_at,
    rating: Number(m.avg_rating),
    reviewCount: Number(m.review_count),
  }));
}
