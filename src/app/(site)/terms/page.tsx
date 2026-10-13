import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Terms of use (draft)", robots: { index: false } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="9 October 2026">
      <section>
        <h2>Using My Travel Memory</h2>
        <p>
          My Travel Memory lets you create and share pages made from your own travel photos and words. You need an
          account to save drafts and publish memories. Keep your login details secure.
        </p>
      </section>
      <section>
        <h2>Your content</h2>
        <ul>
          <li>You keep ownership of the photos and text you upload.</li>
          <li>You give us permission to store, process and display your content only as needed to run the service and show your memories to the audience you choose.</li>
          <li>Only upload photos you have the right to use, and be thoughtful about publishing images of other people.</li>
        </ul>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Don&apos;t upload unlawful, harmful or infringing content, try to access other people&apos;s data, or overload
          the service. We may remove content or suspend accounts that break these rules.
        </p>
      </section>
      <section>
        <h2>Limits</h2>
        <p>
          To keep the service reliable, accounts are limited to 100 trips and each trip to 60 photos of up to 10 MB
          each. These limits may change.
        </p>
      </section>
      <section>
        <h2>Availability and liability</h2>
        <p>
          The service is provided as is during this first release. Keep your own copies of important photos.
          Liability terms, governing law and contact details must be completed before launch.
        </p>
      </section>
    </LegalPage>
  );
}
