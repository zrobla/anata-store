import type { Metadata } from "next";
import Link from "next/link";

import { CatalogShell } from "@/components/catalog-shell";
import { HomeHero } from "@/components/home-hero";
import { ProductCard } from "@/components/product-card";
import { fetchCategories, fetchHomeProducts, fetchProducts } from "@/lib/api";

export const metadata: Metadata = {
  title: "Accueil - Boutique en ligne smartphones et accessoires premium",
  description:
    "Anata Store: la boutique en ligne premium pour smartphones, tablettes, montres et accessoires.",
  alternates: {
    canonical: "/"
  }
};

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    fetchHomeProducts().catch(() => []),
    fetchCategories().catch(() => [])
  ]);

  const prioritySlugs = [
    "smartphones",
    "tablettes",
    "ordinateurs",
    "montres-connectees",
    "ecouteurs",
    "imprimantes"
  ];
  const priorityCategories = prioritySlugs
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));
  const fallbackCategories = categories.filter(
    (category) => !priorityCategories.some((picked) => picked.slug === category.slug)
  );
  const spotlightCategories = [...priorityCategories, ...fallbackCategories].slice(0, 4);

  const sections = await Promise.all(
    spotlightCategories.map(async (category) => ({
      category,
      products: await fetchProducts({ category: category.slug, pageSize: 4 }).catch(() => [])
    }))
  );

  return (
    <CatalogShell>
      <div className="space-y-8">
        <HomeHero products={products} />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">Univers disponibles</h2>
            <Link href="/s" className="text-xs text-cyan-700 hover:text-cyan-800">
              Voir tout le catalogue
            </Link>
          </div>
          <div className="grid gap-2 grid-cols-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/c/${category.slug}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-2xl">Selection multi-categories</h2>
            <p className="text-sm text-slate-600">Produits vedettes sur plusieurs marques et univers</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {products.length === 0 && (
              <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Catalogue vide ou API indisponible.</p>
            )}
          </div>
        </section>

        {sections
          .filter((section) => section.products.length > 0)
          .map((section) => (
            <section key={section.category.id}>
              <div className="mb-4 flex items-end justify-between">
                <h3 className="font-display text-xl">{section.category.name}</h3>
                <Link href={`/c/${section.category.slug}`} className="text-sm text-cyan-700 hover:text-cyan-800">
                  Voir cette categorie
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {section.products.map((product) => (
                  <ProductCard key={`${section.category.slug}-${product.id}`} product={product} />
                ))}
              </div>
            </section>
          ))}
      </div>
    </CatalogShell>
  );
}
