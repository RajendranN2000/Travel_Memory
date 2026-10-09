import Link from "next/link";
import { listDestinationThemes } from "@/features/themes/registry";
import { LogoFull } from "./logo";

export function SiteFooter() {
  const destinations = listDestinationThemes();
  return (
    <footer className="mt-auto border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-xs">
          <Link href="/" className="inline-block rounded-md" aria-label="Travel Memory Studio home">
            <LogoFull className="w-36" />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Turn trip photos into personal, shareable memory pages, styled after the places you visited.
          </p>
        </div>
        <nav aria-label="Destinations">
          <h2 className="eyebrow text-muted-foreground">Destinations</h2>
          <ul className="mt-3 space-y-1">
            {destinations.map((d) => (
              <li key={d.slug}>
                <Link href={`/destinations/${d.slug}`} className="inline-flex min-h-9 items-center text-sm hover:text-brand">
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Product">
          <h2 className="eyebrow text-muted-foreground">Studio</h2>
          <ul className="mt-3 space-y-1">
            {[
              ["/templates", "Templates"],
              ["/create", "Create a memory"],
              ["/my-memories", "My memories"],
              ["/memory/sample-goa", "See a sample"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-9 items-center text-sm hover:text-brand">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="eyebrow text-muted-foreground">About</h2>
          <ul className="mt-3 space-y-1">
            {[
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
              ["/credits", "Photo credits"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-9 items-center text-sm hover:text-brand">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border/70">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:px-8">
          Destination photography from Wikimedia Commons contributors, used under their stated licences. See{" "}
          <Link href="/credits" className="underline underline-offset-2 hover:text-foreground">
            photo credits
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
