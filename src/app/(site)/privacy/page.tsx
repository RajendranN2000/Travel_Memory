import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Privacy notice (draft)", robots: { index: false } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice" updated="9 October 2026">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: your email address, an optional display name and a securely hashed password, handled by our authentication provider.</li>
          <li>Trip content you create: titles, descriptions, dates, captions, place names you type, and the photos you upload.</li>
          <li>Technical data needed to keep the service running, such as request logs kept by our hosting providers.</li>
        </ul>
        <p>We do not ask for your location, and we do not read GPS or camera data from your photos.</p>
      </section>
      <section>
        <h2>How photos are handled</h2>
        <p>
          Before upload, photos are resized and re-encoded in your browser. This removes embedded metadata such as GPS
          coordinates and camera details. Photos are stored in a private storage bucket. Only you can access them
          until you publish a memory.
        </p>
      </section>
      <section>
        <h2>Sharing and visibility</h2>
        <ul>
          <li><strong>Private:</strong> only you, while signed in, can open the published page.</li>
          <li><strong>Unlisted:</strong> anyone with the link can view it. It is never listed, never included in our sitemap and asks search engines not to index it.</li>
          <li><strong>Public:</strong> anyone can view it. It is only offered to search engines if you turn on indexing.</li>
        </ul>
        <p>Viewers of a published memory receive short-lived links to its photos; storage locations are never made public.</p>
      </section>
      <section>
        <h2>Service providers</h2>
        <p>
          We use Supabase for authentication, database and file storage, and Vercel for hosting. They process data on
          our behalf. Their regions and sub-processors must be confirmed and listed here before launch.
        </p>
      </section>
      <section>
        <h2>Retention and deletion</h2>
        <p>
          You can delete photos, trips, publications or your whole account at any time from the app. Deleting your
          account removes your trips, publications and stored photos. Backups are kept for a limited period and expire
          on the provider&apos;s schedule.
        </p>
      </section>
      <section>
        <h2>Your rights and contact</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, export or delete your data. A contact
          address for privacy requests must be added here before launch.
        </p>
      </section>
    </LegalPage>
  );
}
