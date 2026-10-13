import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Review {
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: string;
  isMine: boolean;
}

export interface ReviewSummary {
  average: number;
  count: number;
  reviews: Review[];
}

/** Ratings and short reviews of a public memory, newest first (latest 50). */
export async function getReviews(slug: string): Promise<ReviewSummary> {
  const empty = { average: 0, count: 0, reviews: [] };
  const supabase = await createClient();
  if (!supabase) return empty;
  const { data, error } = await supabase.rpc("get_memory_reviews", { p_slug: slug });
  // Quietly show nothing if the reviews migration hasn't been applied yet.
  if (error || !data) return empty;
  const reviews = data.map((r) => ({
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    reviewer: r.reviewer,
    isMine: r.is_mine,
  }));
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { average: reviews.length ? total / reviews.length : 0, count: reviews.length, reviews };
}
