import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    // Optimised images are keyed by URL, so they can be cached for a year.
    minimumCacheTTL: 31536000,
  },
  experimental: {
    // Styles ship inside the HTML instead of a render-blocking stylesheet request.
    inlineCss: true,
    serverActions: {
      // Photos upload straight to Supabase Storage; actions only carry metadata.
      bodySizeLimit: "1mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Static assets: destination photos never change in place; brand and music files may, so revalidate monthly.
      { source: "/images/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] },
      { source: "/music/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] },
      // Unlisted memory links must not leak through the Referer header.
      { source: "/memory/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
