import { Globe, Link2, Lock, PencilLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadPublishedMemory } from "@/features/memories/published";
import { MemoryRenderer } from "@/features/templates/render";
import { resolveTheme } from "@/features/themes/registry";

export async function generateMetadata({ params }: PageProps<"/memory/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const memory = await loadPublishedMemory(slug).catch(() => null);
  if (!memory) return { title: "Memory not found", robots: { index: false, follow: false } };
  const { content } = memory;
  const theme = resolveTheme(content.destinationSlug, content.palette);
  const indexable = memory.visibility === "public" && memory.allowIndexing;
  const description = content.description.slice(0, 160) || `A travel memory from ${theme.theme.name}.`;
  return {
    title: content.title || "A travel memory",
    description,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    // Social previews use the destination photo: user photos are private and their URLs expire.
    openGraph:
      memory.visibility === "private"
        ? undefined
        : {
            title: content.title,
            description,
            type: "article",
            images: theme.hero ? [{ url: theme.hero.src, width: theme.hero.width, height: theme.hero.height, alt: theme.hero.alt }] : undefined,
          },
  };
}

export default function MemoryPage({ params }: PageProps<"/memory/[slug]">) {
  return (
    <Suspense fallback={<MemorySkeleton />}>
      <Memory params={params} />
    </Suspense>
  );
}

function MemorySkeleton() {
  return (
    <main id="main" aria-busy className="flex-1">
      <Skeleton className="aspect-[4/5] w-full rounded-none sm:aspect-[16/9]" />
      <div className="mx-auto max-w-3xl space-y-3 px-6 py-12">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </main>
  );
}

const VIS = {
  public: { icon: Globe, label: "Public" },
  unlisted: { icon: Link2, label: "Unlisted" },
  private: { icon: Lock, label: "Private" },
} as const;

async function Memory({ params }: Pick<PageProps<"/memory/[slug]">, "params">) {
  const { slug } = await params;
  const memory = await loadPublishedMemory(slug);
  if (!memory) notFound();
  const vis = VIS[memory.visibility];

  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo className="text-base [&_svg]:size-7" />
          {memory.isOwner ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                <vis.icon aria-hidden className="size-4" /> {vis.label}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href="/my-memories">
                  <PencilLine data-icon="inline-start" /> Manage
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" variant="ghost" className="ml-auto">
              <Link href="/create">Make your own</Link>
            </Button>
          )}
        </div>
        {memory.isSample ? (
          <p className="bg-secondary px-4 py-2 text-center text-xs text-secondary-foreground">
            Sample memory made with licensed destination photography.{" "}
            <Link href="/credits" className="underline underline-offset-2">
              Photo credits
            </Link>
          </p>
        ) : null}
        {memory.isOwner && memory.visibility === "private" ? (
          <p className="bg-secondary px-4 py-2 text-center text-xs">This memory is private. Only you can see it while signed in.</p>
        ) : null}
        {memory.photosUnavailable ? (
          <p role="alert" className="bg-warning/15 px-4 py-2 text-center text-xs">
            Photos can&apos;t be shown right now. The site owner needs to configure the server storage key.
          </p>
        ) : null}
      </header>
      <main id="main" className="flex-1">
        <MemoryRenderer memory={memory.content} priority />
      </main>
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>Made with Travel Memory Studio</p>
          <Link href="/create" className="inline-flex min-h-11 items-center font-medium text-brand hover:underline">
            Turn your own trip into a memory →
          </Link>
        </div>
      </footer>
    </>
  );
}
