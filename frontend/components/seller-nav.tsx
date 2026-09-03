"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navigation du studio.
 *
 * Chaque entree porte une icone et une phrase d'explication: le gerant choisit
 * par reconnaissance visuelle, sans avoir a interpreter un terme de metier.
 * Sur telephone, la navigation devient une barre fixe en bas de l'ecran.
 */

const ENTREES = [
  { href: "/seller", label: "Accueil", aide: "Ce qu'il faut faire aujourd'hui", icone: "🏠", exact: true },
  { href: "/seller/catalog/products", label: "Mes articles", aide: "Ajouter et modifier vos produits", icone: "📦" },
  { href: "/seller/orders", label: "Commandes", aide: "Les clients qui ont commandé", icone: "🛒" },
  { href: "/seller/vitrine", label: "Ma vitrine", aide: "Ce qui est mis en avant sur le site", icone: "⭐" },
  { href: "/seller/content/pages", label: "Mes pages", aide: "Textes du site (À propos, Contact)", icone: "📄" },
  { href: "/seller/audit", label: "Historique", aide: "Les dernières modifications", icone: "🕑" }
];

function estActif(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function SellerNav({ email, onLogout }: { email?: string; onLogout?: () => void }) {
  const pathname = usePathname() || "";

  return (
    <>
      {/* Ordinateur: colonne laterale avec les explications completes. */}
      <aside className="hidden w-72 shrink-0 md:block">
        <div className="sticky top-6 rounded-3xl border-2 border-slate-200 bg-white p-5">
          <p className="font-display text-xl text-ink">Ma boutique</p>
          <p className="mt-1 text-[1rem] text-slate-600">Espace de gestion</p>

          <nav className="mt-5 space-y-1.5">
            {ENTREES.map((entree) => {
              const actif = estActif(pathname, entree.href, entree.exact);
              return (
                <Link
                  key={entree.href}
                  href={entree.href}
                  aria-current={actif ? "page" : undefined}
                  className={`flex items-start gap-3 rounded-2xl p-3 transition ${
                    actif ? "bg-fuel/10 ring-2 ring-fuel" : "hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden className="text-2xl leading-none">
                    {entree.icone}
                  </span>
                  <span>
                    <span className="block text-[1.05rem] font-bold text-ink">{entree.label}</span>
                    <span className="block text-[0.95rem] leading-snug text-slate-600">{entree.aide}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t-2 border-slate-100 pt-4">
            {email && (
              <p className="text-[0.98rem] text-slate-600">
                Connecté : <span className="font-bold text-ink">{email}</span>
              </p>
            )}
            <Link href="/" className="mt-3 block text-[1rem] font-semibold text-slate-700 underline underline-offset-4">
              Voir ma boutique en ligne
            </Link>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="mt-3 min-h-[44px] text-[1rem] font-semibold text-slate-600 underline underline-offset-4"
              >
                Me déconnecter
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Telephone: barre fixe en bas, la ou le pouce arrive naturellement. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {ENTREES.slice(0, 5).map((entree) => {
            const actif = estActif(pathname, entree.href, entree.exact);
            return (
              <li key={entree.href}>
                <Link
                  href={entree.href}
                  aria-current={actif ? "page" : undefined}
                  className={`flex min-h-[62px] flex-col items-center justify-center gap-0.5 px-1 py-2 ${
                    actif ? "text-fuel" : "text-slate-600"
                  }`}
                >
                  <span aria-hidden className="text-xl leading-none">
                    {entree.icone}
                  </span>
                  <span className="text-[0.78rem] font-bold leading-tight">{entree.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
