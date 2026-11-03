import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StillValid",
    short_name: "StillValid",
    description:
      "Compare a saved notice with official sources and see changes with evidence.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#dfeaff",
    theme_color: "#dfeaff",
    icons: [
      {
        src: "/icons/stillvalid-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/stillvalid-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
