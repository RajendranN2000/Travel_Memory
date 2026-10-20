import Link from "next/link";
import { Logo } from "./logo";
import { SocialLinks, SupportEmail } from "./social-links";

const PRODUCT_LINKS = [
  ["/templates", "Templates"],
  ["/reels", "Reels"],
  ["/photo-books", "Photo books"],
  ["/destinations", "Destinations"],
  ["/my-memories", "My memories"],
] as const;

const COMPANY_LINKS = [
  ["/guides", "Guides"],
  ["/feedback", "Send feedback"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
  ["/credits", "Photo credits"],
] as const;

const linkClass = "inline-flex min-h-10 items-center text-sm text-foreground/80 transition-all duration-200 hover:translate-x-0.5 hover:text-brand";

export function SiteFooter() {
  return (
    <footer className="relative mt-auto bg-secondary/40">
      {/* gradient hairline */}
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-[#e8742f] to-transparent opacity-70" />
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-10 px-5 py-12 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <Logo markClassName="h-14" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Turn trip photos into memory pages, reels and photo books, styled after the places you visited.
          </p>
          <SocialLinks className="mt-5 justify-center md:justify-start" whatsappMessage="Hi! I have a question about My Travel Memory." />
          <p className="mt-4 text-sm text-muted-foreground">
            Questions? Email <SupportEmail />
          </p>
        </div>

        <nav aria-label="Product">
          <h2 className="eyebrow text-foreground">Explore</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 md:block">
            {PRODUCT_LINKS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className="eyebrow text-foreground">More</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 md:block">
            {COMPANY_LINKS.map(([href, label]) => (
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
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-5 py-5 text-xs text-muted-foreground sm:px-6 md:flex-row lg:px-8">
          <p>© My Travel Memory. Made for travellers.</p>
          <p>
            Photography from Wikimedia Commons contributors.{" "}
            <Link href="/credits" className="underline underline-offset-2 hover:text-foreground">
              Photo credits
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
