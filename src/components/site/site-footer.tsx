import Link from "next/link";
import { listDestinationThemes } from "@/features/themes/registry";
import { Logo } from "./logo";
import { SocialLinks, SupportEmail } from "./social-links";

const STUDIO_LINKS = [
  ["/templates", "Templates"],
  ["/create", "Create a memory"],
  ["/reels", "Make a reel"],
  ["/photo-books", "Photo books"],
  ["/my-memories", "My memories"],
  ["/memory/sample-goa", "See a sample"],
] as const;

const ABOUT_LINKS = [
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
  ["/credits", "Photo credits"],
  ["/feedback", "Send feedback"],
] as const;

const linkClass = "inline-flex min-h-10 items-center text-sm text-foreground/80 transition-colors hover:text-brand sm:min-h-9";

export function SiteFooter() {
  const destinations = listDestinationThemes();
  return (
    <footer className="mt-auto border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="col-span-2 flex flex-col items-center text-center md:col-span-1 md:max-w-xs md:items-start md:text-left">
          <Logo markClassName="h-14" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Turn trip photos into personal, shareable memory pages, reel videos and photo books, styled after the places you visited.
          </p>
          <SocialLinks className="mt-5 justify-center md:justify-start" whatsappMessage="Hi! I have a question about My Travel Memory." />
          <p className="mt-4 text-sm text-muted-foreground">
            Questions? Email <SupportEmail />
          </p>
        </div>

        <nav aria-label="Destinations">
          <h2 className="eyebrow text-muted-foreground">Destinations</h2>
          <ul className="mt-3 space-y-0.5">
            {destinations.map((d) => (
              <li key={d.slug}>
                <Link href={`/destinations/${d.slug}`} className={linkClass}>
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Product">
          <h2 className="eyebrow text-muted-foreground">Studio</h2>
          <ul className="mt-3 space-y-0.5">
            {STUDIO_LINKS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal" className="col-span-2 border-t border-border/70 pt-8 md:col-span-1 md:border-t-0 md:pt-0">
          <h2 className="eyebrow text-muted-foreground">About</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 space-y-0.5 md:block">
            {ABOUT_LINKS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border/70">
        <p className="mx-auto max-w-7xl px-5 py-5 text-center text-xs leading-relaxed text-muted-foreground sm:px-6 md:text-left lg:px-8">
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
