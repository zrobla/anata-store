"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ArticleEditeur } from "@/components/boutique/article-editeur";
import {
  Bouton,
  Carte,
  Chargement,
  Confirmation,
  EtatVide,
  EtiquetteDisponibilite,
  Message,
  TitrePage
} from "@/components/boutique/kit";
import { useSellerAuth } from "@/components/seller-auth-provider";
import { formatFcfa } from "@/lib/currency";
import {
  fetchArticles,
  fetchSellerBrands,
  fetchSellerCategories,
  retireArticle,
  updateArticle
} from "@/lib/seller-api";
import { Article, ArticleDisponibilite, SellerBrand, SellerCategory } from "@/lib/types";

/**
 * Mes articles: l'ecran principal du gerant.
 *
 * Priorites d'affichage: la photo (on reconnait l'article d'un coup d'oeil),
 * le prix, la quantite restante et l'etat de vente. Les actions frequentes
 * (remettre en vente, corriger le stock) sont accessibles sans ouvrir la fiche.
 */

type Filtre = "TOUS" | "EN_VENTE" | "ATTENTION" | "HORS_LIGNE";

const FILTRES: Array<{ cle: Filtre; label: string }> = [
  { cle: "TOUS", label: "Tous" },
  { cle: "EN_VENTE", label: "En vente" },
  { cle: "ATTENTION", label: "À réapprovisionner" },
  { cle: "HORS_LIGNE", label: "Retirés du site" }
];

function correspondAuFiltre(article: Article, filtre: Filtre) {
  if (filtre === "TOUS") return true;
  if (filtre === "EN_VENTE") return article.disponibilite === "EN_VENTE";
  if (filtre === "ATTENTION") return article.disponibilite === "STOCK_BAS" || article.disponibilite === "EPUISE";
  return article.disponibilite === "HORS_LIGNE";
}

export default function MesArticlesPage() {
  const { token } = useSellerAuth();

  const [articles, setArticles] = useState<Article[]>([]);
  const [marques, setMarques] = useState<SellerBrand[]>([]);
  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("TOUS");

  const [vue, setVue] = useState<"liste" | "ajout" | "modification">("liste");
  const [articleEnEdition, setArticleEnEdition] = useState<Article | null>(null);
  const [articleARetirer, setArticleARetirer] = useState<Article | null>(null);
  const [actionEnCours, setActionEnCours] = useState("");

  const charger = useCallback(
    async function charger(silencieux = false) {
      try {
        if (!silencieux) {
          setChargement(true);
        }
        setErreur("");
        const [listeArticles, listeMarques, listeCategories] = await Promise.all([
          fetchArticles(token),
          fetchSellerBrands(),
          fetchSellerCategories()
        ]);
        setArticles(listeArticles);
        setMarques(listeMarques);
        setCategories(listeCategories);
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

  const articlesAffiches = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return articles.filter((article) => {
      if (!correspondAuFiltre(article, filtre)) {
        return false;
      }
      if (!terme) {
        return true;
      }
      return (
        article.nom.toLowerCase().includes(terme) ||
        article.marque_nom.toLowerCase().includes(terme) ||
        article.categorie_nom.toLowerCase().includes(terme)
      );
    });
  }, [articles, filtre, recherche]);

  const compteurs = useMemo(() => {
    const parEtat = (etat: ArticleDisponibilite) => articles.filter((a) => a.disponibilite === etat).length;
    return {
      total: articles.length,
      enVente: parEtat("EN_VENTE"),
      aSurveiller: parEtat("STOCK_BAS") + parEtat("EPUISE")
    };
  }, [articles]);

  function terminerEdition(message: string) {
    setVue("liste");
    setArticleEnEdition(null);
    setSucces(message);
    setErreur("");
    charger(true);
  }

  async function basculerEnLigne(article: Article) {
    try {
      setActionEnCours(article.id);
      setErreur("");
      await updateArticle(token, article.id, { en_ligne: !article.en_ligne });
      setSucces(
        article.en_ligne
          ? `« ${article.nom} » a été retiré du site.`
          : `« ${article.nom} » est de nouveau visible sur le site.`
      );
      await charger(true);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setActionEnCours("");
    }
  }

  async function confirmerRetrait() {
    if (!articleARetirer) {
      return;
    }
    try {
      setActionEnCours(articleARetirer.id);
      setErreur("");
      await retireArticle(token, articleARetirer.id);
      setSucces(`« ${articleARetirer.nom} » n'est plus en vente.`);
      setArticleARetirer(null);
      await charger(true);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Le retrait n'a pas pu être effectué.");
    } finally {
      setActionEnCours("");
    }
  }

  /* --- Ajout / modification -------------------------------------------- */

  if (vue === "ajout" || (vue === "modification" && articleEnEdition)) {
    return (
      <div className="space-y-6">
        <TitrePage
          titre={vue === "ajout" ? "Ajouter un article" : "Modifier l'article"}
          sousTitre={
            vue === "ajout"
              ? "Trois étapes simples : l'article, son prix, ses photos."
              : articleEnEdition?.nom
          }
        />
        <Carte>
          <ArticleEditeur
            article={vue === "modification" ? articleEnEdition : null}
            marques={marques}
            categories={categories}
            onTermine={terminerEdition}
            onAnnuler={() => {
              setVue("liste");
              setArticleEnEdition(null);
            }}
          />
        </Carte>
      </div>
    );
  }

  /* --- Liste ------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      <TitrePage
        titre="Mes articles"
        sousTitre={
          chargement
            ? undefined
            : `${compteurs.total} article${compteurs.total > 1 ? "s" : ""} · ${compteurs.enVente} en vente${
                compteurs.aSurveiller > 0 ? ` · ${compteurs.aSurveiller} à réapprovisionner` : ""
              }`
        }
        action={
          <Bouton onClick={() => setVue("ajout")} icone={<span aria-hidden>＋</span>}>
            Ajouter un article
          </Bouton>
        }
      />

      {succes && <Message type="succes">{succes}</Message>}
      {erreur && <Message type="erreur">{erreur}</Message>}

      <Carte className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[1.05rem] font-bold text-ink">Rechercher un article</span>
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Nom, marque ou catégorie"
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-[1.05rem] focus:border-fuel focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {FILTRES.map((item) => (
            <button
              key={item.cle}
              type="button"
              onClick={() => setFiltre(item.cle)}
              className={`min-h-[44px] rounded-full border-2 px-4 text-[1rem] font-bold transition ${
                filtre === item.cle
                  ? "border-fuel bg-fuel text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Carte>

      {chargement && <Chargement texte="Chargement de vos articles..." />}

      {!chargement && articlesAffiches.length === 0 && (
        <EtatVide
          titre={articles.length === 0 ? "Aucun article pour l'instant" : "Aucun article ne correspond"}
          texte={
            articles.length === 0
              ? "Ajoutez votre premier article : son nom, son prix, une photo, et il sera en ligne."
              : "Essayez un autre mot ou choisissez le filtre « Tous »."
          }
          action={
            articles.length === 0 ? (
              <Bouton onClick={() => setVue("ajout")}>Ajouter mon premier article</Bouton>
            ) : (
              <Bouton
                variant="secondaire"
                onClick={() => {
                  setRecherche("");
                  setFiltre("TOUS");
                }}
              >
                Voir tous les articles
              </Bouton>
            )
          }
        />
      )}

      {!chargement && articlesAffiches.length > 0 && (
        <ul className="space-y-3">
          {articlesAffiches.map((article) => (
            <li key={article.id}>
              <article className="rounded-3xl border-2 border-slate-200 bg-white p-4">
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-28 sm:w-28">
                    {article.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={article.photo_url} alt={article.nom} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-center text-[0.85rem] font-bold text-slate-500">
                        <span aria-hidden className="text-2xl">
                          📷
                        </span>
                        Sans photo
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-[1.15rem] font-bold leading-snug text-ink">{article.nom}</h2>
                      <EtiquetteDisponibilite etat={article.disponibilite} />
                    </div>

                    <p className="mt-1 text-[1rem] text-slate-600">
                      {article.marque_nom}
                      {article.categorie_nom ? ` · ${article.categorie_nom}` : ""}
                    </p>

                    <p className="mt-2 text-[1.1rem] font-bold text-ink">
                      {article.prix_promo != null ? (
                        <>
                          <span className="text-fuel">{formatFcfa(article.prix_promo)}</span>
                          <span className="ml-2 text-[1rem] font-semibold text-slate-500 line-through">
                            {formatFcfa(article.prix ?? 0)}
                          </span>
                        </>
                      ) : (
                        formatFcfa(article.prix ?? 0)
                      )}
                    </p>

                    <p className="mt-1 text-[1rem] text-slate-600">
                      {article.quantite > 0 ? (
                        <>
                          Il en reste <span className="font-bold text-ink">{article.quantite}</span>
                        </>
                      ) : (
                        <span className="font-bold text-rose-700">Plus aucun en stock</span>
                      )}
                      {article.nombre_photos === 0 && (
                        <span className="ml-2 font-semibold text-amber-700">· photo manquante</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-slate-100 pt-3">
                  <Bouton
                    variant="secondaire"
                    onClick={() => {
                      setArticleEnEdition(article);
                      setVue("modification");
                    }}
                  >
                    Modifier
                  </Bouton>
                  <Bouton
                    variant="secondaire"
                    onClick={() => basculerEnLigne(article)}
                    disabled={actionEnCours === article.id}
                  >
                    {article.en_ligne ? "Retirer du site" : "Remettre en vente"}
                  </Bouton>
                  {article.en_ligne && (
                    <Bouton variant="danger" onClick={() => setArticleARetirer(article)}>
                      Ne plus vendre
                    </Bouton>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {articleARetirer && (
        <Confirmation
          titre="Ne plus vendre cet article ?"
          texte={`« ${articleARetirer.nom} » disparaîtra de votre boutique. Rien n'est effacé : vos commandes passées sont conservées et vous pourrez le remettre en vente quand vous voulez.`}
          libelleConfirmer="Oui, ne plus le vendre"
          onConfirmer={confirmerRetrait}
          onAnnuler={() => setArticleARetirer(null)}
          occupe={actionEnCours === articleARetirer.id}
        />
      )}
    </div>
  );
}
