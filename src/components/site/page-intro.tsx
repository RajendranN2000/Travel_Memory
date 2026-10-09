import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageIntro({
  eyebrow,
  title,
  children,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-6 pt-12 pb-10 sm:pt-16 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? <p className="eyebrow text-brand">{eyebrow}</p> : null}
        <h1 className="mt-3 font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.03] tracking-tight">{title}</h1>
        {children ? <div className="mt-4 text-lg leading-relaxed text-muted-foreground">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
