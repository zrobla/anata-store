import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/seo"
import type { Brand, Category, ProductListItem } from "@/lib/types"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1"

type ListPayload<T> = T[] | { items?: T[]; results?: T[] }

function normalizeList<T>(payload: ListPayload<T>): T[] {
  if (Array.isArray(payload)) {
    return payload
  }
  if (Array.isArray(payload.items)) {
    return payload.items
  }
  if (Array.isArray(payload.results)) {
    return payload.results
  }
  return []
}

async function fetchList<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 3600 }
    })
    if (!response.ok) {
      return []
    }
    const payload = (await response.json()) as ListPayload<T>
    return normalizeList(payload)
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const [products, categories, brands] = await Promise.all([
    fetchList<ProductListItem>("/products?page_size=100"),
    fetchList<Category>("/catalog/categories"),
    fetchList<Brand>("/catalog/brands")
  ])

  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1
    }
  ]

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/p/${product.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9
  }))

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/c/${category.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8
  }))

  const brandRoutes: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: absoluteUrl(`/b/${brand.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8
  }))

  return [...coreRoutes, ...productRoutes, ...categoryRoutes, ...brandRoutes]
}
