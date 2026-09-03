"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Bouton,
  Carte,
  Chargement,
  EtatVide,
  Message,
  TitrePage
} from "@/components/boutique/kit";
import { useSellerAuth } from "@/components/seller-auth-provider";
import { formatFcfa } from "@/lib/currency";
import { fetchArticles, updateArticle } from "@/lib/seller-api";
import { Article } from "@/lib/types";

/**
 * Ma vitrine: choisir les articles mis en avant sur le site.
 *
 * Un seul geste possible ici (ajouter ou retirer de la vitrine), pour que
 * l'ecran reste comprehensible sans explication.
 */

export default function VitrinePage() {
  const { token } = useSellerAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [recherche, setRecherche] = useState("");
  const [articleOccupe, setArticleOccupe] = useState("");

  const charger = useCallback(
    async function charger(silencieux = false) {
      try {
        if (!silencieux) {
          setChargement(true);
        }
        setErreur("");
        setArticles(await fetchArticles(token));
      } catch (error) {
        setErreur(error instanceof Error ? error.message : "Impossible de charger vos articles.");
      } finally {
        setChargement(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      charger();
    }
  }, [token, charger]);

  const misEnAvant = useMemo(
    () => articles.filter((article) => article.mis_en_avant && article.en_ligne),
    [articles]
  );

  const candidats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return articles
      .filter((article) => article.en_ligne && !article.mis_en_avant)
      .filter((article) => (terme ? article.nom.toLowerCase().includes(terme) : true))
      .slice(0, terme ? 30 : 8);
  }, [articles, recherche]);

  async function basculer(article: Article) {
    try {
      setArticleOccupe(article.id);
      setErreur("");
      await updateArticle(token, article.id, { mis_en_avant: !article.mis_en_avant });
      setSucces(
        article.mis_en_avant
          ? `« ${article.nom} » a été retiré de la vitrine.`
          : `« ${article.nom} » est maintenant mis en avant.`
      );
      await charger(true);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setArticleOccupe("");
    }
  }

  function ligneArticle(article: Article, enVitrine: boolean) {
    return (
      <li key={article.id} className="flex items-center gap-4 py-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {article.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.photo_url} alt={article.nom} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden className="flex h-full w-full items-center justify-center text-xl">
              📷
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[1.08rem] font-bold leading-snug text-ink">{article.nom}</p>
          <p className="mt-0.5 text-[1rem] text-slate-600">
            {formatFcfa(article.prix_promo ?? article.prix ?? 0)}
            {article.nombre_photos === 0 && <span className="ml-2 font-semibold text-amber-700">· sans photo</span>}
          </p>
        </div>

        <Bouton
          variant={enVitrine ? "danger" : "secondaire"}
          onClick={() => basculer(article)}
          disabled={articleOccupe === article.id}
        >
          {enVitrine ? "Retirer" : "Mettre en avant"}
        </Bouton>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <TitrePage
        titre="Ma vitrine"
        sousTitre="Choisissez les articles que vos clients voient en premier sur la page d'accueil du site."
      />

      {succes && <Message type="succes">{succes}</Message>}
      {erreur && <Message type="erreur">{erreur}</Message>}

      {chargement && <Chargement texte="Chargement de votre vitrine..." />}

      {!chargement && (
        <>
          <Carte>
            <h2 className="font-display text-2xl text-ink">
              Actuellement en vitrine ({misEnAvant.length})
            </h2>

            {misEnAvant.length === 0 ? (
              <div className="mt-4">
                <EtatVide
                  titre="Votre vitrine est vide"
                  texte="Choisissez ci-dessous les articles à mettre en avant : ce sont vos meilleures ventes ou vos nouveautés."
                />
              </div>
            ) : (
              <>
                <ul className="mt-3 divide-y-2 divide-slate-100">
                  {misEnAvant.map((article) => ligneArticle(article, true))}
                </ul>
                {misEnAvant.length > 8 && (
                  <Message type="info">
                    Vous mettez {misEnAvant.length} articles en avant. Une vitrine plus courte (6 à 8 articles) attire
                    davantage l&apos;attention.
                  </Message>
                )}
              </>
            )}
          </Carte>

          <Carte>
            <h2 className="font-display text-2xl text-ink">Ajouter un article à la vitrine</h2>
            <p className="mt-1 text-[1.05rem] text-slate-600">
              Seuls les articles visibles sur le site peuvent être mis en avant.
            </p>

            <input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un article par son nom"
              className="mt-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-[1.05rem] focus:border-fuel focus:outline-none"
            />

            {candidats.length === 0 ? (
              <p className="mt-4 text-[1.05rem] text-slate-600">
                {recherche.trim()
                  ? "Aucun article ne correspond à votre recherche."
                  : "Tous vos articles en ligne sont déjà en vitrine."}
              </p>
            ) : (
              <ul className="mt-2 divide-y-2 divide-slate-100">
                {candidats.map((article) => ligneArticle(article, false))}
              </ul>
            )}
          </Carte>
        </>
      )}
    </div>
  );
}
