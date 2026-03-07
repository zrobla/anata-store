import type { Metadata } from "next"
import Link from "next/link"

import { BackLink } from "@/components/back-link"
import { CatalogShell } from "@/components/catalog-shell"
import { ProductCard } from "@/components/product-card"
import { fetchBrands, fetchProducts } from "@/lib/api"
import { absoluteUrl, humanizeSlug } from "@/lib/seo"

type BrandPageProps = { params: Promise<{ brandSlug: string }> }

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { brandSlug } = await params
  const [products, brands] = await Promise.all([
    fetchProducts({ brand: brandSlug }).catch(() => []),
    fetchBrands().catch(() => [])
  ])

  const brandName = brands.find((brand) => brand.slug === brandSlug)?.name || humanizeSlug(brandSlug)
  const title = `${brandName} | Smartphones et accessoires`
  const description = `Decouvrez ${products.length} produits premium de la marque ${brandName}.`

  return {
    title,
    description,
    alternates: {
      canonical: `/b/${brandSlug}`
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/b/${brandSlug}`
    },
    twitter: {
      card: "summary",
      title,
      description
    }
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brandSlug } = await params
  const [products, brands] = await Promise.all([
    fetchProducts({ brand: brandSlug }).catch(() => []),
    fetchBrands().catch(() => [])
  ])

  const brandName = brands.find((brand) => brand.slug === brandSlug)?.name || humanizeSlug(brandSlug)

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
        name: brandName,
        item: absoluteUrl(`/b/${brandSlug}`)
      }
    ]
  }

  return (
    <CatalogShell>
      <section className="space-y-4">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <BackLink fallbackHref="/" label="Retour accueil" />
        <h1 className="font-display text-3xl">Marque: {brandName}</h1>
        <p className="mt-2 text-sm text-slate-600">Hub marque avec produits et offres actives.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {products.length === 0 && (
            <div className="space-y-3 rounded-xl bg-white p-4 text-sm text-slate-600">
              <p>Aucun produit actif pour cette marque.</p>
              <Link
                href="/s"
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
