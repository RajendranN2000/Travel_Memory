import type { Metadata } from "next";
import { DestinationCard } from "@/components/memory/destination-card";
import { PageIntro } from "@/components/site/page-intro";
import { listDestinationThemes } from "@/features/themes/registry";

export const metadata: Metadata = {
  title: "Destinations",
  description: "Explore destination themes for Munnar, Goa, Ooty, Wayanad and Manali, each with its own palette, typography and photography.",
};

export default function DestinationsPage() {
  const themes = listDestinationThemes();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <PageIntro eyebrow="Destinations" title="Choose where your memory begins">
        Each destination comes with a complete visual identity: a palette drawn from the landscape, a matching type
        pairing, a photo treatment and small decorative details. Pick one to see it up close.
      </PageIntro>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme, i) => (
          <li key={theme.slug} className={i < 2 ? "lg:col-span-1" : ""}>
            <DestinationCard
              theme={theme}
              aspect="aspect-[4/5] sm:aspect-[3/4]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          </li>
        ))}
        <li className="flex flex-col justify-center rounded-lg border border-dashed border-input p-8 text-center sm:aspect-[3/4]">
          <p className="font-display text-2xl">More places are on the way</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            New destinations are added as configuration, so every theme gets the same complete treatment. Any trip
            can use the neutral theme in the meantime.
          </p>
        </li>
      </ul>
    </div>
  );
}
