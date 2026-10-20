import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JsonLd } from "@/components/seo/json-ld";
import { fontVariables } from "@/config/fonts";
import { SAME_AS, SITE_KEYWORDS, SITE_NAME } from "@/config/seo";
import { getSiteUrl } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "My Travel Memory — turn trip photos into beautiful memories",
    template: "%s · My Travel Memory",
  },
  description:
    "Turn your travel photos into personal, shareable memory pages, designed around the places you visited.",
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  category: "travel",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  twitter: { card: "summary_large_image" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    images: [{ url: "/images/destinations/munnar/hero.webp", width: 2400, height: 1600 }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={fontVariables} suppressHydrationWarning>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before hydration. */}
      <body className="flex min-h-svh flex-col" suppressHydrationWarning>
        <JsonLd
          data={[
            { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: getSiteUrl(), logo: `${getSiteUrl()}/brand/Logo.png`, sameAs: SAME_AS },
            { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: getSiteUrl(), inLanguage: "en-GB" },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: SITE_NAME,
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Web",
              url: getSiteUrl(),
              description: "Create travel memory pages, reels and print-ready photo books from your trip photos.",
            },
          ]}
        />
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
