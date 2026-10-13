import Link from "next/link";
import { getCurrentUser } from "@/features/auth/session";
import { getReviews } from "@/features/reviews/queries";
import { ReviewForm } from "./review-form";
import { StarRating } from "./star-rating";

const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Ratings and reviews for a public memory, with a form for signed-in visitors. */
export async function MemoryReviews({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  const [{ average, count, reviews }, user] = await Promise.all([getReviews(slug), getCurrentUser()]);
  const mine = reviews.find((r) => r.isMine);

  return (
    <section aria-labelledby="reviews-title" className="border-t border-border bg-background print:hidden">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="reviews-title" className="font-display text-2xl">
            Ratings &amp; reviews
          </h2>
          {count > 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <StarRating value={average} />
              <span>
                {average.toFixed(1)} · {count} {count === 1 ? "review" : "reviews"}
              </span>
            </p>
          ) : null}
        </div>

        {count === 0 ? <p className="mt-3 text-sm text-muted-foreground">No reviews yet. Be the first to leave one.</p> : null}

        {reviews.length > 0 ? (
          <ul className="mt-6 divide-y divide-border">
            {reviews.map((r, i) => (
              <li key={i} className="py-4">
                <div className="flex items-center gap-3">
                  <StarRating value={r.rating} />
                  <span className="text-sm font-medium">{r.isMine ? "You" : r.reviewer}</span>
                  <time dateTime={r.createdAt} className="text-xs text-muted-foreground">
                    {date.format(new Date(r.createdAt))}
                  </time>
                </div>
                {r.comment ? <p className="mt-2 leading-relaxed text-foreground/90">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8">
          {isOwner ? (
            <p className="text-sm text-muted-foreground">Visitors who sign in can rate and review your memory here.</p>
          ) : user ? (
            <ReviewForm slug={slug} initialRating={mine?.rating} initialComment={mine?.comment} hasReview={Boolean(mine)} />
          ) : (
            <p className="text-sm">
              <Link href={`/login?next=${encodeURIComponent(`/memory/${slug}`)}`} className="font-medium text-brand underline underline-offset-2">
                Sign in
              </Link>{" "}
              to rate and review this memory.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
