import type { Metadata } from "next"
import Link from "next/link"

import { BackLink } from "@/components/back-link"
import { CatalogShell } from "@/components/catalog-shell"
import { ProductCard } from "@/components/product-card"
import { fetchCategories, fetchProducts } from "@/lib/api"
import { absoluteUrl, humanizeSlug } from "@/lib/seo"

type CategoryPageProps = { params: Promise<{ categorySlug: string }> }

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params
  const [products, categories] = await Promise.all([
    fetchProducts({ category: categorySlug }).catch(() => []),
    fetchCategories().catch(() => [])
  ])

  const categoryName = categories.find((category) => category.slug === categorySlug)?.name || humanizeSlug(categorySlug)
  const title = `${categoryName} | Catalogue smartphones`
  const description = `Decouvrez ${products.length} produits premium dans la categorie ${categoryName}.`

  return {
    title,
    description,
    alternates: {
      canonical: `/c/${categorySlug}`
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/c/${categorySlug}`
    },
    twitter: {
      card: "summary",
      title,
      description
    }
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params
  const [products, categories] = await Promise.all([
    fetchProducts({ category: categorySlug }).catch(() => []),
    fetchCategories().catch(() => [])
  ])

  const categoryName = categories.find((category) => category.slug === categorySlug)?.name || humanizeSlug(categorySlug)

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: absoluteUrl("/")
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryName,
        item: absoluteUrl(`/c/${categorySlug}`)
      }
    ]
  }

  return (
    <CatalogShell activeCategorySlug={categorySlug} categories={categories}>
      <section className="space-y-4">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <BackLink fallbackHref="/" label="Retour accueil" />
        <h1 className="font-display text-3xl">Categorie: {categoryName}</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {products.length === 0 && (
            <div className="space-y-3 rounded-xl bg-white p-4 text-sm text-slate-600">
              <p>Aucun produit actif dans cette categorie.</p>
              <Link
                href="/s?q=samsung"
                className="inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
              >
                Voir tout le catalogue
              </Link>
            </div>
          )}
        </div>
      </section>
    </CatalogShell>
  )
}
