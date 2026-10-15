"use client";

import { ChampMontant } from "@/components/boutique/kit";
import { formatFcfa } from "@/lib/currency";

/**
 * Capacites de stockage et prix de chacune.
 *
 * Un 512 Go ne se vend pas au prix d'un 128 Go: chaque capacite cochee devient
 * une version que le client choisit sur la fiche, avec son propre prix. Rien de
 * coche = un seul prix pour tout l'article.
 *
 * Le stock, lui, reste commun a l'article: le gerant compte ses appareils une
 * fois, pas capacite par capacite.
 */

export type LigneCapaciteBrouillon = {
  capacite: string;
  prix: string;
  prix_promo: string;
};

export function ArticleCapacitesPrix({
  capacites,
  lignes,
  prixDeReference,
  erreur,
  onChange
}: {
  capacites: string[];
  lignes: LigneCapaciteBrouillon[];
  prixDeReference: string;
  erreur?: string;
  onChange: (lignes: LigneCapaciteBrouillon[]) => void;
}) {
  if (capacites.length === 0) {
    return null;
  }

  const choisies = new Set(lignes.map((ligne) => ligne.capacite));

  function basculer(capacite: string) {
    if (choisies.has(capacite)) {
      onChange(lignes.filter((ligne) => ligne.capacite !== capacite));
      return;
    }
    // On prerempli avec le prix deja saisi: le gerant n'ajuste que les ecarts.
    const ajoutee = { capacite, prix: prixDeReference.trim(), prix_promo: "" };
    const suivantes = [...lignes, ajoutee];
    suivantes.sort((a, b) => capacites.indexOf(a.capacite) - capacites.indexOf(b.capacite));
    onChange(suivantes);
  }

  function modifier(capacite: string, champ: "prix" | "prix_promo", valeur: string) {
    onChange(lignes.map((ligne) => (ligne.capacite === capacite ? { ...ligne, [champ]: valeur } : ligne)));
  }

  const apercu = lignes
    .filter((ligne) => Number(ligne.prix) > 0)
    .map((ligne) => `${ligne.capacite} — ${formatFcfa(Number(ligne.prix_promo) || Number(ligne.prix))}`);

  return (
    <div className="space-y-4 rounded-3xl border-2 border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div>
        <h3 className="text-[1.05rem] font-bold text-ink">Capacités et prix</h3>
        <p className="mt-1 text-[1rem] leading-relaxed text-slate-600">
          Cet article existe en plusieurs capacités vendues à des prix différents ? Cochez-les et indiquez le
          prix de chacune. Sinon, ne cochez rien : le prix de vente ci-dessus s&apos;applique.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {capacites.map((capacite) => {
          const choisie = choisies.has(capacite);
          return (
            <button
              key={capacite}
              type="button"
              aria-pressed={choisie}
              onClick={() => basculer(capacite)}
              className={`min-h-[48px] rounded-full border-2 px-5 text-[1.05rem] font-bold transition ${
                choisie
                  ? "border-fuel bg-fuel text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {capacite}
            </button>
          );
        })}
      </div>

      {erreur && <p className="text-[1rem] font-semibold text-red-700">{erreur}</p>}

      {lignes.length > 0 && (
        <div className="space-y-3">
          {lignes.map((ligne) => (
            <div
              key={ligne.capacite}
              className="rounded-2xl border-2 border-slate-200 bg-white p-3 sm:flex sm:items-end sm:gap-4"
            >
              <p className="text-[1.1rem] font-bold text-ink sm:w-24 sm:shrink-0 sm:pb-3">{ligne.capacite}</p>

              <div className="mt-2 grid flex-1 gap-3 sm:mt-0 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[0.95rem] font-semibold text-slate-600">Prix de vente</span>
                  <ChampMontant
                    value={ligne.prix}
                    onChange={(event) => modifier(ligne.capacite, "prix", event.target.value)}
                    placeholder="185000"
                    aria-label={`Prix de vente du ${ligne.capacite}`}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[0.95rem] font-semibold text-slate-600">
                    Prix promotionnel
                  </span>
                  <ChampMontant
                    value={ligne.prix_promo}
                    onChange={(event) => modifier(ligne.capacite, "prix_promo", event.target.value)}
                    placeholder="Aucune promotion"
                    aria-label={`Prix promotionnel du ${ligne.capacite}`}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {apercu.length > 0 && (
        <p className="rounded-2xl bg-white px-4 py-3 text-[1rem] text-slate-700">
          Vos clients choisiront : <span className="font-bold text-ink">{apercu.join(" · ")}</span>
        </p>
      )}
    </div>
  );
}
