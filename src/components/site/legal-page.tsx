import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-14 pb-24 sm:px-6">
      <div role="note" className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm leading-relaxed">
        <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
        <p>
          <strong>Draft for review.</strong> This page is an initial draft written for the Phase 1 release and must be
          reviewed by a qualified legal professional before public launch. It is not legal advice.
        </p>
      </div>
      <h1 className="mt-10 font-display text-[clamp(2.25rem,5vw,3.25rem)] leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="mt-10 space-y-8 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_p]:text-foreground/85 [&_section]:space-y-3 [&_ul]:space-y-1.5 [&_ul]:text-foreground/85">
        {children}
      </div>
    </article>
  );
}
