import Link from "next/link";
import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <LogoMark className="h-16" />
      <p className="eyebrow mt-8 text-brand">404 · Off the map</p>
      <h1 className="mt-3 max-w-xl font-display text-[clamp(2.25rem,6vw,3.75rem)] leading-tight tracking-tight">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        The link may be mistyped, or the memory may have been unpublished or made private by its owner.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/destinations">Explore destinations</Link>
        </Button>
      </div>
    </main>
  );
}
