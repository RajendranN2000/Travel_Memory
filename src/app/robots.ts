import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/editor/", "/preview/", "/my-memories", "/settings", "/create", "/login", "/signup", "/reset-password", "/auth/", "/setup"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
