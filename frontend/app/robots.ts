import type { MetadataRoute } from "next"

import { getSiteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/", "/c/", "/b/"],
        disallow: ["/seller/", "/account/", "/cart", "/checkout", "/compare", "/order/", "/returns/", "/blog", "/pages/"]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  }
}
