"use client";

import { ArticleOptions } from "@/lib/types";

/**
 * Couleurs disponibles pour un article.
 *
 * Le gerant coche ce qu'il a en boutique: c'est une information affichee au
 * client, pas une version vendable separement (meme prix, meme stock). Les
 * capacites, elles, portent un prix et vivent dans `ArticleCapacitesPrix`.
 */

function basculer(liste: string[], valeur: string): string[] {
  return liste.includes(valeur) ? liste.filter((item) => item !== valeur) : [...liste, valeur];
}

/** Une couleur tres claire a besoin d'un contour pour rester visible sur fond blanc. */
function pastilleClaire(code: string) {
  const hex = code.replace("#", "");
  if (hex.length !== 6) {
    return false;
  }
  const luminosite =
    (0.299 * parseInt(hex.slice(0, 2), 16) +
      0.587 * parseInt(hex.slice(2, 4), 16) +
      0.114 * parseInt(hex.slice(4, 6), 16)) /
    255;
  return luminosite > 0.8;
}

export function ArticleCaracteristiques({
  options,
  couleurs,
  onCouleurs
}: {
  options: ArticleOptions | null;
  couleurs: string[];
  onCouleurs: (valeurs: string[]) => void;
}) {
  if (!options) {
    return null;
  }

  return (
    <div className="rounded-3xl border-2 border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div>
        <h3 className="text-[1.05rem] font-bold text-ink">Couleurs disponibles</h3>
        <p className="mt-1 text-[1rem] leading-relaxed text-slate-600">
          Cochez les couleurs que vous avez en boutique. Elles s&apos;affichent sur la fiche du produit.
          Laissez vide si l&apos;article n&apos;existe qu&apos;en une seule couleur.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {options.couleurs.map((couleur) => {
            const choisie = couleurs.includes(couleur.valeur);
            return (
              <button
                key={couleur.valeur}
                type="button"
                aria-pressed={choisie}
                onClick={() => onCouleurs(basculer(couleurs, couleur.valeur))}
                className={`inline-flex min-h-[48px] items-center gap-2.5 rounded-full border-2 px-4 text-[1rem] font-bold transition ${
                  choisie
                    ? "border-fuel bg-white text-ink shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-6 w-6 shrink-0 rounded-full ${
                    pastilleClaire(couleur.code) ? "border-2 border-slate-300" : ""
                  }`}
                  style={{ backgroundColor: couleur.code }}
                />
                {couleur.libelle}
                {choisie && <span aria-hidden className="text-fuel">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
