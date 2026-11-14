import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HalfTime",
    short_name: "HalfTime",
    description: "Reads a jail's court papers and finds every undertrial past the Section 479 line.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1ece0",
    theme_color: "#121315",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
