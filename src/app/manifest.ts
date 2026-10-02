import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shift Master",
    short_name: "Shift Master",
    description: "Jadwal shift dan jadwal lab UPT Laboratorium.",
    lang: "id",
    // Without an id the start_url is the app's identity; keep it fixed so the
    // start_url can change without installed copies becoming a different app.
    id: "/",
    // proxy.ts sends a signed-out launch of the installed app straight to /login.
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      { src: "/brand/logo-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
