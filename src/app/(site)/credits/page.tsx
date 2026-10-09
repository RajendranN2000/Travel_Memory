import type { Metadata } from "next";
import Image from "next/image";
import { PageIntro } from "@/components/site/page-intro";
import { getAllImageCredits } from "@/features/themes/images";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Attribution and licences for the destination photography used in Travel Memory Studio.",
};

export default function CreditsPage() {
  const credits = getAllImageCredits();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
      <PageIntro eyebrow="Credits" title="Photo credits">
        Destination photographs come from Wikimedia Commons and are used under the licences below. They have been
        resized and re-encoded. Themes may also apply colour adjustments when the photos are shown.
      </PageIntro>
      <ul className="divide-y divide-border border-y border-border">
        {credits.map((img) => (
          <li key={img.key} className="flex gap-4 py-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-medium">{img.alt}</p>
              {img.source ? (
                <p className="mt-1 text-muted-foreground">
                  By {img.source.author} ·{" "}
                  {img.source.licenseUrl ? (
                    <a href={img.source.licenseUrl} className="underline underline-offset-2" rel="noopener noreferrer license" target="_blank">
                      {img.source.license}
                    </a>
                  ) : (
                    img.source.license
                  )}{" "}
                  ·{" "}
                  <a href={img.source.url} className="underline underline-offset-2" rel="noopener noreferrer" target="_blank">
                    Source
                  </a>
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
