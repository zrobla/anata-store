"use client";

import { FormEvent, useState } from "react";

import { ArticlePhotos } from "@/components/boutique/article-photos";
import {
  Bouton,
  Champ,
  ChampListe,
  ChampMontant,
  ChampTexte,
  ChampZoneTexte,
  Interrupteur,
  Message
} from "@/components/boutique/kit";
import { useSellerAuth } from "@/components/seller-auth-provider";
import { formatFcfa } from "@/lib/currency";
import { createArticle, updateArticle } from "@/lib/seller-api";
import { Article, SellerBrand, SellerCategory } from "@/lib/types";

/**
 * Ajout et modification d'un article.
 *
 * A l'ajout, on avance par etapes courtes: une question a la fois, avec un
 * recapitulatif avant validation. A la modification, tout est visible d'un coup
 * car le gerant vient corriger un point precis (souvent le prix ou la quantite).
 */

type Brouillon = {
  nom: string;
  marque: string;
  categorie: string;
  prix: string;
  prix_promo: string;
  quantite: string;
  seuil_alerte: string;
  description_courte: string;
  description: string;
  en_ligne: boolean;
  mis_en_avant: boolean;
};

function brouillonDepuis(article?: Article | null): Brouillon {
  return {
    nom: article?.nom || "",
    marque: article?.marque || "",
    categorie: article?.categorie || "",
    prix: article?.prix != null ? String(article.prix) : "",
    prix_promo: article?.prix_promo != null ? String(article.prix_promo) : "",
    quantite: article ? String(article.quantite) : "",
    seuil_alerte: article?.seuil_alerte != null ? String(article.seuil_alerte) : "",
    description_courte: article?.description_courte || "",
    description: article?.description || "",
    en_ligne: article ? article.en_ligne : true,
    mis_en_avant: article ? article.mis_en_avant : false
  };
}

function nombreOuNull(valeur: string): number | null {
  const nettoye = valeur.trim();
  if (!nettoye) {
    return null;
  }
  const nombre = Number(nettoye);
  return Number.isFinite(nombre) ? nombre : null;
}

export function ArticleEditeur({
  article,
  marques,
  categories,
  onTermine,
  onAnnuler
}: {
  article?: Article | null;
  marques: SellerBrand[];
  categories: SellerCategory[];
  onTermine: (message: string) => void;
  onAnnuler: () => void;
}) {
  const { token } = useSellerAuth();
  const modeCreation = !article;

  const [brouillon, setBrouillon] = useState<Brouillon>(() => brouillonDepuis(article));
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [articleCree, setArticleCree] = useState<Article | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [erreursChamps, setErreursChamps] = useState<Partial<Record<keyof Brouillon, string>>>({});

  const articleCourant = article || articleCree;

  function modifier<K extends keyof Brouillon>(champ: K, valeur: Brouillon[K]) {
    setBrouillon((precedent) => ({ ...precedent, [champ]: valeur }));
    setErreursChamps((precedent) => ({ ...precedent, [champ]: undefined }));
  }

  /** Verifie une etape et renvoie true si on peut avancer. */
  function validerEtape(numero: 1 | 2): boolean {
    const erreurs: Partial<Record<keyof Brouillon, string>> = {};

    if (numero === 1) {
      if (!brouillon.nom.trim()) {
        erreurs.nom = "Indiquez le nom de l'article.";
      }
      if (!brouillon.marque) {
        erreurs.marque = "Choisissez une marque.";
      }
      if (!brouillon.categorie) {
        erreurs.categorie = "Choisissez une catégorie.";
      }
    }

    if (numero === 2) {
      const prix = nombreOuNull(brouillon.prix);
      if (prix === null || prix <= 0) {
        erreurs.prix = "Indiquez le prix de vente en francs CFA.";
      }
      const promo = nombreOuNull(brouillon.prix_promo);
      if (promo !== null && prix !== null && promo >= prix) {
        erreurs.prix_promo = "Le prix promotionnel doit être inférieur au prix normal.";
      }
      const quantite = nombreOuNull(brouillon.quantite);
      if (quantite !== null && quantite < 0) {
        erreurs.quantite = "La quantité ne peut pas être négative.";
      }
    }

    setErreursChamps(erreurs);
    return Object.keys(erreurs).length === 0;
  }

  function chargeUtile() {
    return {
      nom: brouillon.nom.trim(),
      marque: brouillon.marque,
      categorie: brouillon.categorie,
      prix: nombreOuNull(brouillon.prix) ?? 0,
      prix_promo: nombreOuNull(brouillon.prix_promo),
      quantite: nombreOuNull(brouillon.quantite) ?? 0,
      seuil_alerte: nombreOuNull(brouillon.seuil_alerte),
      description_courte: brouillon.description_courte.trim(),
      description: brouillon.description.trim(),
      en_ligne: brouillon.en_ligne,
      mis_en_avant: brouillon.mis_en_avant
    };
  }

  async function onCreer() {
    if (!validerEtape(2)) {
      return;
    }
    try {
      setEnregistrement(true);
      setErreur("");
      const cree = await createArticle(token, chargeUtile());
      setArticleCree(cree);
      // On enchaine sur les photos: c'est le moment ou le gerant les a sous la main.
      setEtape(3);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "L'article n'a pas pu être créé.");
    } finally {
      setEnregistrement(false);
    }
  }

  async function onEnregistrerModifications(event: FormEvent) {
    event.preventDefault();
    if (!article || !validerEtape(1) || !validerEtape(2)) {
      return;
    }
    try {
      setEnregistrement(true);
      setErreur("");
      await updateArticle(token, article.id, chargeUtile());
      onTermine("Modifications enregistrées.");
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Les modifications n'ont pas pu être enregistrées.");
    } finally {
      setEnregistrement(false);
    }
  }

  const champsIdentite = (
    <div className="space-y-5">
      <Champ
        label="Nom de l'article"
        aide="Écrivez-le comme vos clients le cherchent. Exemple : Samsung Galaxy A56 128 Go"
        requis
        erreur={erreursChamps.nom}
      >
        <ChampTexte
          value={brouillon.nom}
          onChange={(event) => modifier("nom", event.target.value)}
          placeholder="Samsung Galaxy A56 128 Go"
          autoFocus
        />
      </Champ>

      <div className="grid gap-5 md:grid-cols-2">
        <Champ label="Marque" requis erreur={erreursChamps.marque}>
          <ChampListe value={brouillon.marque} onChange={(event) => modifier("marque", event.target.value)}>
            <option value="">— Choisir une marque —</option>
            {marques.map((marque) => (
              <option key={marque.id} value={marque.id}>
                {marque.name}
              </option>
            ))}
          </ChampListe>
        </Champ>

        <Champ label="Catégorie" aide="Le rayon où l'article apparaît" requis erreur={erreursChamps.categorie}>
          <ChampListe value={brouillon.categorie} onChange={(event) => modifier("categorie", event.target.value)}>
            <option value="">— Choisir une catégorie —</option>
            {categories.map((categorie) => (
              <option key={categorie.id} value={categorie.id}>
                {categorie.name}
              </option>
            ))}
          </ChampListe>
        </Champ>
      </div>

      <Champ label="Description courte" aide="Une phrase qui résume l'article. Elle s'affiche sous le nom.">
        <ChampTexte
          value={brouillon.description_courte}
          onChange={(event) => modifier("description_courte", event.target.value)}
          placeholder="Écran 6,7 pouces, 128 Go, double SIM"
        />
      </Champ>
    </div>
  );

  const champsPrix = (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Champ label="Prix de vente" aide="Le prix affiché aux clients" requis erreur={erreursChamps.prix}>
          <ChampMontant
            value={brouillon.prix}
            onChange={(event) => modifier("prix", event.target.value)}
            placeholder="185000"
          />
        </Champ>

        <Champ
          label="Prix promotionnel"
          aide="À remplir seulement si l'article est en promotion. Laissez vide sinon."
          erreur={erreursChamps.prix_promo}
        >
          <ChampMontant
            value={brouillon.prix_promo}
            onChange={(event) => modifier("prix_promo", event.target.value)}
            placeholder="Aucune promotion"
          />
        </Champ>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Champ
          label="Quantité en stock"
          aide="Combien en avez-vous en boutique ? À zéro, l'article s'affiche « épuisé »."
          erreur={erreursChamps.quantite}
        >
          <ChampTexte
            type="number"
            min={0}
            inputMode="numeric"
            value={brouillon.quantite}
            onChange={(event) => modifier("quantite", event.target.value)}
            placeholder="0"
          />
        </Champ>

        <Champ label="M'alerter à partir de" aide="Vous serez prévenu quand il n'en restera plus que ce nombre.">
          <ChampTexte
            type="number"
            min={0}
            inputMode="numeric"
            value={brouillon.seuil_alerte}
            onChange={(event) => modifier("seuil_alerte", event.target.value)}
            placeholder="2"
          />
        </Champ>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Interrupteur
          label="Visible sur le site"
          aide="Désactivez pour retirer l'article de la boutique sans le supprimer."
          actif={brouillon.en_ligne}
          onChange={(valeur) => modifier("en_ligne", valeur)}
        />
        <Interrupteur
          label="Mettre en avant"
          aide="L'article apparaît dans les sélections de la page d'accueil."
          actif={brouillon.mis_en_avant}
          onChange={(valeur) => modifier("mis_en_avant", valeur)}
        />
      </div>

      <Champ label="Description complète" aide="Les détails affichés sur la fiche de l'article (facultatif).">
        <ChampZoneTexte
          rows={4}
          value={brouillon.description}
          onChange={(event) => modifier("description", event.target.value)}
          placeholder="Caractéristiques, contenu de la boîte, garantie..."
        />
      </Champ>
    </div>
  );

  /* --- Modification d'un article existant ------------------------------ */

  if (!modeCreation && article) {
    return (
      <form onSubmit={onEnregistrerModifications} className="space-y-8">
        {erreur && <Message type="erreur">{erreur}</Message>}

        {article.nombre_variantes > 1 && (
          <Message type="info">
            Cet article existe en {article.nombre_variantes} versions. Les prix et quantités modifiés ici
            s&apos;appliquent à la version principale.
          </Message>
        )}

        {champsIdentite}
        {champsPrix}

        <div className="border-t-2 border-slate-100 pt-6">
          <ArticlePhotos articleId={article.id} />
        </div>

        <div className="sticky bottom-20 z-10 flex flex-col gap-3 border-t-2 border-slate-100 bg-white pt-4 sm:flex-row-reverse md:bottom-0">
          <Bouton type="submit" disabled={enregistrement} pleineLargeur>
            {enregistrement ? "Enregistrement..." : "Enregistrer les modifications"}
          </Bouton>
          <Bouton type="button" variant="secondaire" onClick={onAnnuler} disabled={enregistrement} pleineLargeur>
            Annuler
          </Bouton>
        </div>
      </form>
    );
  }

  /* --- Ajout guide ------------------------------------------------------ */

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2" aria-label="Étapes de l'ajout">
        {[
          { numero: 1, label: "L'article" },
          { numero: 2, label: "Prix et stock" },
          { numero: 3, label: "Photos" }
        ].map((item) => {
          const atteinte = etape >= item.numero;
          return (
            <li key={item.numero} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[1rem] font-bold ${
                  atteinte ? "bg-fuel text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {item.numero}
              </span>
              <span
                className={`hidden text-[1rem] font-bold sm:block ${atteinte ? "text-ink" : "text-slate-500"}`}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>

      {erreur && <Message type="erreur">{erreur}</Message>}

      {etape === 1 && (
        <>
          <p className="text-[1.1rem] leading-relaxed text-slate-700">
            Commençons par identifier l&apos;article que vous voulez vendre.
          </p>
          {champsIdentite}
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Bouton
              onClick={() => {
                if (validerEtape(1)) {
                  setEtape(2);
                }
              }}
              pleineLargeur
            >
              Continuer
            </Bouton>
            <Bouton variant="secondaire" onClick={onAnnuler} pleineLargeur>
              Annuler
            </Bouton>
          </div>
        </>
      )}

      {etape === 2 && (
        <>
          <p className="text-[1.1rem] leading-relaxed text-slate-700">
            À quel prix vendez-vous <span className="font-bold">{brouillon.nom}</span> ?
          </p>
          {champsPrix}
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Bouton onClick={onCreer} disabled={enregistrement} pleineLargeur>
              {enregistrement ? "Création..." : "Créer l'article"}
            </Bouton>
            <Bouton variant="secondaire" onClick={() => setEtape(1)} disabled={enregistrement} pleineLargeur>
              Revenir en arrière
            </Bouton>
          </div>
        </>
      )}

      {etape === 3 && articleCourant && (
        <>
          <Message type="succes">
            « {articleCourant.nom} » est créé
            {brouillon.en_ligne ? " et visible sur votre boutique" : ""}. Prix :{" "}
            {formatFcfa(articleCourant.prix ?? 0)}.
          </Message>

          <ArticlePhotos articleId={articleCourant.id} />

          <Bouton onClick={() => onTermine(`« ${articleCourant.nom} » a été ajouté à votre boutique.`)} pleineLargeur>
            J&apos;ai terminé
          </Bouton>
        </>
      )}
    </div>
  );
}
