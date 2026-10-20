import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Travel Memory",
    short_name: "Travel Memory",
    description: "Turn trip photos into memory pages, reels and photo books.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#1f3a2e",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
