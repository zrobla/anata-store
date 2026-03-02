import Image from "next/image";
import Link from "next/link";

import { ProductListItem } from "@/lib/types";

type HomeHeroProps = {
  products: ProductListItem[];
};

function fcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

function imageUrl(product: ProductListItem) {
  return product.thumbnail_url || `https://placehold.co/900x900/png?text=${encodeURIComponent(product.name)}`;
}

export function HomeHero({ products }: HomeHeroProps) {
  const featuredProduct = products[0];
  const sideCards = products.slice(1, 3);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 p-4 text-white md:p-6">
      <div className="absolute -right-20 -top-10 h-56 w-56 rounded-full bg-fuel/25 blur-3xl" />
      <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative grid gap-4 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
        <div className="space-y-3">
          <p className="inline-flex rounded-full border border-fuel/40 bg-fuel/20 px-3 py-1 text-xs font-semibold tracking-wide text-fuel">
            Offre de la semaine - fin ce soir 23:59
          </p>

          <h1 className="max-w-2xl font-display text-2xl leading-tight md:text-4xl">
            Choisis ton smartphone en confiance.
            <span className="block text-cyan-200">Ressens la difference des le premier jour.</span>
          </h1>

          <p className="max-w-2xl text-sm text-slate-200">
            Notre selection est orientee performance reelle, autonomie et fiabilite. Tu compares vite, tu decides
            mieux, tu commandes sans stress.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/s?q=samsung" className="rounded-xl bg-fuel px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuel/30">
              Je veux un smartphone fiable maintenant
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          {featuredProduct ? (
            <article className="h-[154px] rounded-2xl border border-white/25 bg-white/10 p-2.5 backdrop-blur">
              <div className="grid h-full items-center gap-2 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-cyan-100">Best Choice du moment</p>
                  <p className="mt-0.5 line-clamp-1 font-display text-base">{featuredProduct.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-fuel">
                    {fcfa(featuredProduct.min_promo_price ?? featuredProduct.min_price)}
                  </p>
                  <Link
                    href={`/p/${featuredProduct.slug}`}
                    className="mt-1 inline-flex rounded-md border border-white/40 px-2 py-0.5 text-[10px]"
                  >
                    Voir ce modele
                  </Link>
                </div>
                <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-xl bg-white/95 sm:mx-0">
                  <Image
                    src={imageUrl(featuredProduct)}
                    alt={featuredProduct.name}
                    fill
                    unoptimized
                    referrerPolicy="no-referrer"
                    sizes="160px"
                    className="object-contain p-1.5"
                  />
                </div>
              </div>
            </article>
          ) : (
            <article className="rounded-2xl border border-white/25 bg-white/10 p-4 text-sm text-slate-100">
              Catalogue en cours de chargement. Lance une recherche pour demarrer.
            </article>
          )}

          {sideCards.length > 0 && (
            <div className="hidden gap-3 lg:grid sm:grid-cols-2">
              {sideCards.map((product) => (
                <Link
                  key={product.id}
                  href={`/p/${product.slug}`}
                  className="group rounded-2xl border border-white/20 bg-white/10 p-2.5 transition hover:bg-white/15"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/95">
                      <Image
                        src={imageUrl(product)}
                        alt={product.name}
                        fill
                        unoptimized
                        referrerPolicy="no-referrer"
                        sizes="96px"
                        className="object-contain p-1.5 transition duration-300 group-hover:scale-[1.06]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[11px] leading-tight">{product.name}</p>
                      <p className="mt-1 text-[10px] font-semibold text-cyan-100">
                        {fcfa(product.min_promo_price ?? product.min_price)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
