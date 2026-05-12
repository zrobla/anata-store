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
            <div className="relative h-[260px] overflow-hidden rounded-3xl shadow-2xl shadow-slate-950/40 ring-1 ring-white/10 xl:h-[132px] xl:rounded-2xl xl:shadow-none xl:ring-0">
              <div className={`flex h-full ${featuredSlides.length > 1 ? "hero-featured-track" : ""}`}>
                {featuredSlides.map((product, idx) => (
                  <article
                    key={`${product.id}-${idx}`}
                    className="hero-card-in relative h-[260px] w-full shrink-0 overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-br from-white/12 via-white/5 to-fuel/12 p-3.5 backdrop-blur-xl xl:h-[132px] xl:rounded-2xl xl:bg-white/10 xl:p-2 xl:backdrop-blur"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuel/25 blur-3xl xl:hidden" aria-hidden="true" />

                    <div className="relative grid h-full grid-cols-[1fr_auto] items-stretch gap-3 xl:items-center xl:gap-1.5">
                      <div className="flex h-full min-w-0 flex-col justify-between xl:block">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 rounded-full bg-fuel/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuel ring-1 ring-fuel/40 xl:gap-0 xl:bg-transparent xl:px-0 xl:py-0 xl:ring-0 xl:text-cyan-100 xl:tracking-wide">
                            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-2.5 w-2.5 fill-current xl:hidden">
                              <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.77l-5.2 2.74.99-5.8L1.58 7.62l5.82-.85L10 1.5z" />
                            </svg>
                            <span className="xl:text-[9px]">Meilleur choix</span>
                          </span>
                          <p className="mt-1.5 line-clamp-2 break-words font-display text-[15px] font-semibold leading-snug text-white drop-shadow-sm xl:mt-0.5 xl:line-clamp-1 xl:text-sm xl:font-normal xl:leading-normal xl:drop-shadow-none">{product.name}</p>
                        </div>
                        <div className="space-y-1.5 xl:mt-1 xl:flex xl:items-center xl:gap-2 xl:space-y-0">
                          <div className="min-w-0 xl:contents">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-300 xl:hidden">À partir de</p>
                            <p className="truncate text-[15px] font-bold leading-none text-fuel drop-shadow-sm xl:text-[11px] xl:font-semibold xl:drop-shadow-none">{fcfa(product.min_promo_price ?? product.min_price)}</p>
                          </div>
                          <Link
                            href={`/p/${product.slug}`}
                            className="block w-full rounded-full bg-white/95 px-3 py-[5px] text-center text-[11px] font-semibold tracking-wide text-ink shadow-md shadow-slate-950/25 transition active:scale-95 xl:inline-flex xl:w-auto xl:rounded-md xl:border xl:border-white/40 xl:bg-transparent xl:px-1.5 xl:py-0.5 xl:text-[9px] xl:font-normal xl:tracking-normal xl:text-white xl:shadow-none xl:active:scale-100"
                          >
                            Voir le modèle
                          </Link>
                        </div>
                      </div>
                      <div className="relative flex shrink-0 items-center justify-center xl:contents">
                        <div className="pointer-events-none absolute -bottom-2 left-1/2 h-2.5 w-28 -translate-x-1/2 rounded-full bg-slate-950/45 blur-lg xl:hidden" aria-hidden="true" />
                        <div className="relative h-[148px] w-[148px] overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-950/35 ring-1 ring-white/40 xl:h-20 xl:w-20 xl:rounded-xl xl:bg-white/95 xl:shadow-none xl:ring-0">
                          <Image
                            src={imageUrl(product)}
                            alt={product.name}
                            fill
                            unoptimized
                            referrerPolicy="no-referrer"
                            sizes="(max-width: 1280px) 160px, 128px"
                            className="object-contain p-1 xl:p-1"
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {featuredSlides.length > 1 && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 gap-1.5 xl:bottom-1.5 xl:right-1.5 xl:left-auto xl:translate-x-0 xl:gap-1">
                  {featuredSlides.map((product, idx) => (
                    <span key={`${product.id}-dot-${idx}`} className={`h-1.5 rounded-full bg-white/90 shadow-md shadow-slate-950/40 transition-all xl:h-1.5 xl:bg-white/70 xl:shadow-none ${idx === 0 ? "w-6 bg-fuel xl:w-1.5 xl:bg-white/70" : "w-1.5"}`} />
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

          <div className="relative overflow-hidden rounded-xl border border-white/15 bg-gradient-to-r from-slate-950/30 via-white/10 to-slate-950/30 px-1.5 py-1.5 shadow-md shadow-slate-950/30 ring-1 ring-white/10 xl:rounded-xl xl:border-white/20 xl:bg-white/10 xl:py-1 xl:shadow-none xl:ring-0">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-slate-950/40 to-transparent xl:hidden" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-slate-950/40 to-transparent xl:hidden" aria-hidden="true" />
            <div className="flex w-max min-w-full items-center gap-2 hero-badge-track">
              {[...trustBadges, ...trustBadges].map((badge, idx) => (
                <span
                  key={`${badge}-${idx}`}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-slate-900/40 px-3 py-1 text-[10px] font-medium text-slate-100 backdrop-blur-sm xl:gap-0 xl:px-3 xl:py-1 xl:backdrop-blur-0"
                >
                  <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-fuel shadow-[0_0_6px_rgba(249,115,22,0.7)] xl:hidden" />
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
