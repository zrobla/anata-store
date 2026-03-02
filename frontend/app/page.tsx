import type { Metadata } from "next";

import { CatalogShell } from "@/components/catalog-shell";
import { HomeHero } from "@/components/home-hero";
import { ProductCard } from "@/components/product-card";
import { fetchHomeProducts } from "@/lib/api";

export const metadata: Metadata = {
  title: "Accueil smartphones premium",
  description: "Catalogue premium smartphones, tablettes, montres et accessoires Samsung.",
  alternates: {
    canonical: "/"
  }
};

export default async function HomePage() {
  const products = await fetchHomeProducts().catch(() => []);

  return (
    <CatalogShell>
      <div className="space-y-8">
        <HomeHero products={products} />
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-2xl">Best Sellers</h2>
            <p className="text-sm text-slate-600">Selection premium smartphones</p>
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
      </div>
    </CatalogShell>
  );
}
