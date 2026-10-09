import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDestinationImage } from "@/features/themes/images";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function AuthShell({
  title,
  description,
  imageKey,
  children,
  footer,
}: {
  title: string;
  description: string;
  imageKey: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const image = getDestinationImage(imageKey);
  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-16">
      <div className="mx-auto w-full max-w-md lg:py-8">
        <h1 className="font-display text-[clamp(2.25rem,5vw,3rem)] leading-tight tracking-tight">{title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{description}</p>
        {!isSupabaseConfigured() ? (
          <Alert className="mt-6">
            <AlertTitle>Accounts aren&apos;t available yet</AlertTitle>
            <AlertDescription>
              Supabase isn&apos;t configured for this environment.{" "}
              <Link href="/setup" className="underline underline-offset-2">
                See the setup guide
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">{footer}</div> : null}
      </div>
      {image ? (
        <figure className="relative hidden overflow-hidden rounded-lg lg:block">
          <Image src={image.src} alt={image.alt} fill sizes="50vw" className="object-cover" placeholder={image.blurDataURL ? "blur" : "empty"} blurDataURL={image.blurDataURL} />
          {image.source ? (
            <figcaption className="absolute right-3 bottom-3 rounded bg-black/55 px-2 py-1 text-xs text-white">
              {image.source.author} · {image.source.license}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
    </div>
  );
}
