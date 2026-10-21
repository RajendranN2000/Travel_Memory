import Link from "next/link";
import { listDestinationMemories } from "@/features/memories/destination";
import { headingClass } from "@/features/themes/css";
import type { DestinationTheme } from "@/features/themes/types";
import { cn } from "@/lib/utils";
import { StarRating } from "./star-rating";

/** Memories other travellers have published for this destination, linking to their pages for ratings and reviews. */
export async function DestinationMemories({ theme }: { theme: DestinationTheme }) {
  const memories = await listDestinationMemories(theme.slug);
  const heading = headingClass(theme);

  return (
    <section className="border-t border-th-line">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className={cn(heading, "text-[clamp(1.75rem,3.5vw,2.5rem)] text-th-primary")}>
          {theme.name} memories from travellers
        </h2>
        <p className="mt-2 max-w-2xl text-th-muted">
          Real trips shared by the community. Open one to read it, then leave a rating or a comment.
        </p>

        {memories.length === 0 ? (
          <p className="mt-8 rounded-th border border-dashed border-th-line p-8 text-th-muted">
            No one has shared a {theme.name} memory yet. Publish yours as public and it will appear here.
          </p>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {memories.map((m) => (
              <li key={m.slug}>
                <Link href={`/memory/${m.slug}`} className="group block overflow-hidden rounded-th border border-th-line bg-th-surface transition-shadow hover:shadow-lifted">
                  <div className="aspect-[4/5] overflow-hidden bg-th-secondary">
                    {m.coverUrl ? (
                      // Signed storage URLs expire, so they bypass the image optimiser.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.coverUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-semibold">{m.title || "Untitled trip"}</h3>
                    <p className="mt-2 flex items-center gap-2 text-sm text-th-muted">
                      {m.reviewCount > 0 ? (
                        <>
                          <StarRating value={m.rating} />
                          <span>
                            {m.rating.toFixed(1)} ({m.reviewCount})
                          </span>
                        </>
                      ) : (
                        <span>No reviews yet</span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
