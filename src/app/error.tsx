"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="eyebrow text-destructive">Something went wrong</p>
      <h1 className="mt-3 max-w-xl font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight tracking-tight">
        This page hit a snag
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Your saved work is safe. Try again, and if the problem keeps happening, come back in a few minutes.
      </p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>
          <RotateCcw data-icon="inline-start" /> Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
