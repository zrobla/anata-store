import type { Metadata } from "next"
import Link from "next/link"

import { BackLink } from "@/components/back-link"
import { CatalogShell } from "@/components/catalog-shell"
import { ProductCard } from "@/components/product-card"
import { fetchProducts } from "@/lib/api"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q.trim() : ""
  const title = q ? `Recherche: ${q}` : "Recherche produits"
  const description = q
    ? `Resultats de recherche internes pour ${q}.`
    : "Moteur de recherche interne catalogue."

  return {
    title,
    description,
    alternates: {
      canonical: "/s"
    },
    robots: {
      index: false,
      follow: true
    }
  }
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q : ""
  const products = await fetchProducts(q ? { q } : {}).catch(() => [])

  return (
    <CatalogShell>
      <section className="space-y-4">
        <BackLink fallbackHref="/" label="Retour accueil" />
        <h1 className="font-display text-3xl">Recherche</h1>
        <p className="mt-2 text-sm text-slate-600">Resultats pour: {q || "tous les produits"}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {products.length === 0 && (
            <div className="space-y-3 rounded-xl bg-white p-4 text-sm text-slate-600">
              <p>Aucun resultat pour cette recherche.</p>
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
