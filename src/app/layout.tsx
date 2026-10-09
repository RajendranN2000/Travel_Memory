import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontVariables } from "@/config/fonts";
import { getSiteUrl } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Travel Memory Studio — turn trip photos into beautiful memories",
    template: "%s · Travel Memory Studio",
  },
  description:
    "Turn your travel photos into personal, shareable memory pages, designed around the places you visited.",
  applicationName: "Travel Memory Studio",
  openGraph: {
    type: "website",
    siteName: "Travel Memory Studio",
    images: [{ url: "/images/destinations/munnar/hero.webp", width: 2400, height: 1600 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={fontVariables}>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before hydration. */}
      <body className="flex min-h-svh flex-col" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
