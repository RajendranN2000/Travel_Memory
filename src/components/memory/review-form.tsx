"use client";

import { Loader2, Star } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/features/auth/schemas";
import { deleteReview, submitReview } from "@/features/reviews/actions";
import { cn } from "@/lib/utils";

export function ReviewForm({
  slug,
  initialRating,
  initialComment,
  hasReview,
}: {
  slug: string;
  initialRating?: number;
  initialComment?: string;
  hasReview: boolean;
}) {
  const [state, action, pending] = useActionState(submitReview, idleState);
  const [rating, setRating] = useState(initialRating ?? 0);
  const [removing, startRemove] = useTransition();
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
      <h3 className="font-semibold">{hasReview ? "Update your review" : "Leave a review"}</h3>
      {state.status !== "idle" ? <FormMessage status={state.status} message={state.message} /> : null}
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating || ""} />

      <div>
        <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
              onClick={() => setRating(n)}
              className="grid size-11 place-items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Star aria-hidden className={cn("size-7 transition-colors", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
            </button>
          ))}
        </div>
        {fieldErrors.rating ? (
          <p role="alert" className="text-sm text-destructive">
            {fieldErrors.rating}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="review-comment" className="text-sm font-medium">
          Short review <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea id="review-comment" name="comment" rows={3} maxLength={500} defaultValue={initialComment} aria-invalid={fieldErrors.comment ? true : undefined} />
        {fieldErrors.comment ? (
          <p role="alert" className="text-sm text-destructive">
            {fieldErrors.comment}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || removing}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} {hasReview ? "Update review" : "Post review"}
        </Button>
        {hasReview ? (
          <Button type="button" variant="ghost" disabled={pending || removing} onClick={() => startRemove(async () => void (await deleteReview(slug)))}>
            Remove my review
          </Button>
        ) : null}
      </div>
    </form>
  );
}
