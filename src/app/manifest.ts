import type { MetadataRoute } from "next";

/** Lets people add RegretNothing to their home screen, and on Android puts it in the Share menu of store apps. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RegretNothing",
    short_name: "RegretNothing",
    description: "Share what you want, and what you already have, so every gift lands.",
    start_url: "/me",
    display: "standalone",
    background_color: "#fbf7f1",
    theme_color: "#1f5f4a",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/add",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
