import Image from "next/image";
import Link from "next/link";

import { formatFcfa } from "@/lib/currency";
import { ProductListItem } from "@/lib/types";

type HomeHeroProps = {
  products: ProductListItem[];
};

function fcfa(value: number) {
  return formatFcfa(value);
}

function imageUrl(product: ProductListItem) {
  return product.thumbnail_url || `https://placehold.co/900x900/png?text=${encodeURIComponent(product.name)}`;
}

export function HomeHero({ products }: HomeHeroProps) {
  const featuredSlides = products.slice(0, 3);
  while (featuredSlides.length > 0 && featuredSlides.length < 3) {
    featuredSlides.push(featuredSlides[featuredSlides.length - 1]);
  }
  const sideCards = products.slice(1, 3);
  const trustBadges = [
    "Livraison rapide 24h-72h",
    "Paiement COD sécurisé",
    "Garantie & support Anata",
    "Produits 100% vérifiés"
  ];

  return (
    <section className="hero-gradient-shift relative overflow-hidden rounded-3xl border border-slate-200 p-3 text-white md:p-4">
      <div className="hero-float-slow absolute -right-20 -top-10 h-56 w-56 rounded-full bg-fuel/25 blur-3xl" />
      <div className="hero-float-fast absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative grid gap-3 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
        <div className="order-2 space-y-2 xl:order-none xl:flex xl:min-h-[220px] xl:flex-col xl:space-y-0">
          <div className="space-y-1.5 xl:space-y-2">
            <p className="hero-fade-up inline-flex rounded-full border border-fuel/40 bg-fuel/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-fuel xl:px-3 xl:py-1 xl:text-xs">
              Offre de la semaine - fin ce soir 23:59
            </p>

            <h1 className="hero-fade-up max-w-2xl font-display text-base leading-tight md:text-lg xl:text-3xl">
              Choisis ton smartphone en confiance.
              <span className="block text-cyan-200">Ressens la différence dès le premier jour.</span>
            </h1>

            <p className="hero-fade-up max-w-2xl text-[11px] leading-snug text-slate-200 xl:text-sm xl:leading-normal">
              Notre boutique en ligne est orientée performance réelle, autonomie et fiabilité. Tu compares vite, tu décides
              mieux, tu commandes sans stress.
            </p>
          </div>

          <div className="hero-fade-up flex flex-wrap gap-3 xl:mt-auto">
            <Link
              href="/s"
              className="hero-cta-pulse rounded-lg bg-fuel px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-fuel/30 xl:rounded-xl xl:px-4 xl:py-1.5 xl:text-sm"
            >
              Je veux un smartphone maintenant
            </Link>
          </div>
        </div>

        <div className="order-1 grid gap-2.5 xl:order-none xl:-mt-1">
          {featuredSlides.length > 0 ? (
            <div className="relative h-[240px] overflow-hidden rounded-2xl xl:h-[132px]">
              <div className={`flex h-full ${featuredSlides.length > 1 ? "hero-featured-track" : ""}`}>
                {featuredSlides.map((product, idx) => (
                  <article
                    key={`${product.id}-${idx}`}
                    className="hero-card-in h-[240px] w-full shrink-0 rounded-2xl border border-white/25 bg-white/10 p-3 backdrop-blur xl:h-[132px] xl:p-2"
                  >
                    <div className="grid h-full grid-cols-[1fr_auto] items-center gap-3 xl:gap-1.5">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-cyan-100 xl:text-[9px]">Meilleur choix du moment</p>
                        <p className="mt-1 line-clamp-2 font-display text-base leading-tight xl:mt-0.5 xl:line-clamp-1 xl:text-sm xl:leading-normal">{product.name}</p>
                        <div className="mt-2 flex items-center gap-2 xl:mt-1">
                          <p className="text-sm font-semibold text-fuel xl:text-[11px]">{fcfa(product.min_promo_price ?? product.min_price)}</p>
                          <Link
                            href={`/p/${product.slug}`}
                            className="inline-flex rounded-md border border-white/40 px-2 py-1 text-[11px] xl:px-1.5 xl:py-0.5 xl:text-[9px]"
                          >
                            Voir ce modèle
                          </Link>
                        </div>
                      </div>
                      <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-2xl bg-white/95 sm:mx-0 xl:h-20 xl:w-20 xl:rounded-xl">
                        <Image
                          src={imageUrl(product)}
                          alt={product.name}
                          fill
                          unoptimized
                          referrerPolicy="no-referrer"
                          sizes="(max-width: 1280px) 192px, 128px"
                          className="object-contain p-1.5 xl:p-1"
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {featuredSlides.length > 1 && (
                <div className="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex gap-1">
                  {featuredSlides.map((product, idx) => (
                    <span key={`${product.id}-dot-${idx}`} className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <article className="rounded-2xl border border-white/25 bg-white/10 p-4 text-sm text-slate-100">
              Catalogue en cours de chargement. Lance une recherche pour démarrer.
            </article>
          )}

          {sideCards.length > 0 && (
            <div className="hidden gap-3 lg:grid sm:grid-cols-2">
              {sideCards.map((product) => (
                <Link
                  key={product.id}
                  href={`/p/${product.slug}`}
                  className="hero-card-in group rounded-2xl border border-white/20 bg-white/10 p-2.5 transition hover:bg-white/15"
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
                      <span className="mt-1 inline-flex rounded-md border border-white/40 px-2 py-0.5 text-[10px]">
                        Voir ce modèle
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-white/20 bg-white/10 px-1.5 py-1">
            <div className="flex w-max min-w-full items-center gap-2 hero-badge-track">
              {[...trustBadges, ...trustBadges].map((badge, idx) => (
                <span
                  key={`${badge}-${idx}`}
                  className="whitespace-nowrap rounded-full border border-white/25 bg-slate-900/40 px-3 py-1 text-[10px] font-medium text-slate-100"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
