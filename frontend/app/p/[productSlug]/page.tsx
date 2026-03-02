import type { Metadata } from "next"
import Image from "next/image"

import { BackLink } from "@/components/back-link"
import { CatalogShell } from "@/components/catalog-shell"
import { ProductPurchasePanel } from "@/components/product-purchase-panel"
import { fetchProductBySlug } from "@/lib/api"
import { absoluteUrl } from "@/lib/seo"

type ProductPageProps = { params: Promise<{ productSlug: string }> }

function productDescription(shortDescription: string, description: string) {
  const value = (shortDescription || description || "").trim()
  if (!value) {
    return "Smartphone premium disponible en commande en ligne."
  }
  return value.slice(0, 160)
}

function schemaAvailability(status: "IN_STOCK" | "AVAILABLE_SOON" | "OUT_OF_STOCK") {
  if (status === "IN_STOCK") {
    return "https://schema.org/InStock"
  }
  if (status === "AVAILABLE_SOON") {
    return "https://schema.org/PreOrder"
  }
  return "https://schema.org/OutOfStock"
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { productSlug } = await params
  const product = await fetchProductBySlug(productSlug).catch(() => null)

  if (!product) {
    return {
      title: "Produit introuvable",
      description: "Le produit demande est introuvable.",
      robots: {
        index: false,
        follow: false
      }
    }
  }

  const title = `${product.name} | ${product.brand.name}`
  const description = productDescription(product.short_description, product.description)
  const canonicalPath = `/p/${product.slug}`
  const image = product.media[0]?.url || absoluteUrl("/anata-store-logo-1.png")

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalPath,
      images: [{ url: image, alt: product.name }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productSlug } = await params
  const product = await fetchProductBySlug(productSlug).catch(() => null)

  if (!product) {
    return <p className="rounded-xl bg-white p-4">Produit introuvable.</p>
  }

  const gallery =
    product.media.length > 0
      ? product.media
      : [
          {
            id: "placeholder",
            url: `https://placehold.co/1200x1200/png?text=${encodeURIComponent(product.name)}`,
            alt: product.name,
            kind: "IMAGE" as const
          }
        ]

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: productDescription(product.short_description, product.description),
    image: gallery.map((item) => item.url),
    sku: product.variants[0]?.sku || "",
    brand: {
      "@type": "Brand",
      name: product.brand.name
    },
    category: product.category.name,
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      url: absoluteUrl(`/p/${product.slug}`),
      priceCurrency: "XOF",
      price: variant.promo_price_amount || variant.price_amount,
      availability: schemaAvailability(variant.availability.status),
      sku: variant.sku
    }))
  }

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
        name: product.category.name,
        item: absoluteUrl(`/c/${product.category.slug}`)
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: absoluteUrl(`/p/${product.slug}`)
      }
    ]
  }

  return (
    <CatalogShell activeCategorySlug={product.category.slug}>
      <article className="space-y-4">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <BackLink fallbackHref="/s?q=samsung" label="Retour au catalogue" />
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {gallery.map((m) => (
                <div key={m.id} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                  <Image
                    src={m.url}
                    alt={m.alt || product.name}
                    fill
                    unoptimized
                    referrerPolicy="no-referrer"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-contain p-4"
                  />
                </div>
              ))}
            </div>
          </section>
          <ProductPurchasePanel product={product} />
        </div>
      </article>
    </CatalogShell>
  )
}
