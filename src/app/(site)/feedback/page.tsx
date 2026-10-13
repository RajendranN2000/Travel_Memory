import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro } from "@/components/site/page-intro";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = {
  title: "Send feedback",
  description: "Report a bug or suggest an improvement for My Travel Memory.",
};

export default function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
      <PageIntro eyebrow="Help us improve" title="Send feedback">
        Found a bug or have an idea? Tell us what happened or what you&apos;d like to see. We read every message.
      </PageIntro>
      <div className="max-w-xl">
        <Suspense fallback={<FeedbackForm page="" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

/** Remembers which page the visitor came from, so a bug report says where it happened. */
async function Form({ searchParams }: Pick<PageProps<"/feedback">, "searchParams">) {
  const { from } = await searchParams;
  const page = typeof from === "string" && from.startsWith("/") ? from.slice(0, 300) : "";
  return <FeedbackForm page={page} />;
}
