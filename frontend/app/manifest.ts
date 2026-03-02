import type { MetadataRoute } from "next";

import { STORE_ADDRESS_SHORT, STORE_NAME } from "@/lib/store-info";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: STORE_NAME,
    short_name: STORE_NAME,
    description:
      `${STORE_NAME}, boutique en ligne premium et boutique physique au ${STORE_ADDRESS_SHORT}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#081328",
    lang: "fr",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
