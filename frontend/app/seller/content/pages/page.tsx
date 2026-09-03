"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import {
  Bouton,
  Carte,
  Champ,
  ChampTexte,
  ChampZoneTexte,
  Chargement,
  Confirmation,
  EtatVide,
  Interrupteur,
  Message,
  TitrePage
} from "@/components/boutique/kit";
import { useSellerAuth } from "@/components/seller-auth-provider";
import {
  createSellerContentPage,
  deleteSellerContentPage,
  fetchSellerContentPages,
  updateSellerContentPage
} from "@/lib/seller-api";
import { estHtmlSimple, htmlVersTexte, texteVersHtml } from "@/lib/texte-riche";
import { SellerContentPage } from "@/lib/types";

/**
 * Mes pages: les textes fixes du site (A propos, Conditions de livraison...).
 *
 * Le gerant ecrit du texte normal. La mise en forme est generee a l'enregistrement,
 * il n'a jamais a manipuler de balises.
 */

type Brouillon = {
  titre: string;
  adresse: string;
  texte: string;
  publiee: boolean;
};

const BROUILLON_VIDE: Brouillon = { titre: "", adresse: "", texte: "", publiee: false };

/** L'adresse web est derivee du titre: un champ technique de moins a remplir. */
function adresseDepuisTitre(titre: string) {
  return titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function MesPagesPage() {
  const { token } = useSellerAuth();
  const [pages, setPages] = useState<SellerContentPage[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const [vue, setVue] = useState<"liste" | "edition">("liste");
  const [pageEnEdition, setPageEnEdition] = useState<SellerContentPage | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>(BROUILLON_VIDE);
  const [htmlAvance, setHtmlAvance] = useState(false);
  const [pageASupprimer, setPageASupprimer] = useState<SellerContentPage | null>(null);

  const charger = useCallback(
    async function charger(silencieux = false) {
      try {
        if (!silencieux) {
          setChargement(true);
        }
        setErreur("");
        setPages(await fetchSellerContentPages(token));
      } catch {
        setErreur("Impossible de charger vos pages. Vérifiez votre connexion internet.");
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

  function ouvrirCreation() {
    setPageEnEdition(null);
    setBrouillon(BROUILLON_VIDE);
    setHtmlAvance(false);
    setVue("edition");
  }

  function ouvrirEdition(page: SellerContentPage) {
    const simple = estHtmlSimple(page.body_html);
    setPageEnEdition(page);
    setHtmlAvance(!simple);
    setBrouillon({
      titre: page.title,
      adresse: page.slug,
      texte: simple ? htmlVersTexte(page.body_html) : page.body_html,
      publiee: page.is_published
    });
    setVue("edition");
  }

  async function onEnregistrer(event: FormEvent) {
    event.preventDefault();

    const titre = brouillon.titre.trim();
    if (!titre) {
      setErreur("Donnez un titre à votre page.");
      return;
    }

    const adresse = brouillon.adresse.trim() || adresseDepuisTitre(titre);
    // En mise en forme avancee, on renvoie le contenu tel quel pour ne rien abimer.
    const contenu = htmlAvance ? brouillon.texte : texteVersHtml(brouillon.texte);

    try {
      setEnregistrement(true);
      setErreur("");

      if (pageEnEdition) {
        await updateSellerContentPage(token, pageEnEdition.id, {
          title: titre,
          slug: adresse,
          body_html: contenu,
          is_published: brouillon.publiee
        });
        setSucces(`La page « ${titre} » a été enregistrée.`);
      } else {
        await createSellerContentPage(token, {
          title: titre,
          slug: adresse,
          body_html: contenu,
          is_published: brouillon.publiee
        });
        setSucces(`La page « ${titre} » a été créée.`);
      }

      setVue("liste");
      setPageEnEdition(null);
      await charger(true);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "La page n'a pas pu être enregistrée.");
    } finally {
      setEnregistrement(false);
    }
  }

  async function confirmerSuppression() {
    if (!pageASupprimer) {
      return;
    }
    try {
      setEnregistrement(true);
      await deleteSellerContentPage(token, pageASupprimer.id);
      setSucces(`La page « ${pageASupprimer.title} » a été supprimée.`);
      setPageASupprimer(null);
      await charger(true);
    } catch {
      setErreur("La page n'a pas pu être supprimée.");
    } finally {
      setEnregistrement(false);
    }
  }

  /* --- Edition ---------------------------------------------------------- */

  if (vue === "edition") {
    return (
      <div className="space-y-6">
        <TitrePage
          titre={pageEnEdition ? "Modifier la page" : "Créer une page"}
          sousTitre={pageEnEdition?.title}
        />

        <Carte>
          <form onSubmit={onEnregistrer} className="space-y-5">
            {erreur && <Message type="erreur">{erreur}</Message>}

            {htmlAvance && (
              <Message type="info">
                Cette page utilise une mise en forme avancée. Modifiez-la avec précaution, ou demandez à votre
                prestataire technique.
              </Message>
            )}

            <Champ label="Titre de la page" aide="Il s'affiche en haut de la page" requis>
              <ChampTexte
                value={brouillon.titre}
                onChange={(event) => {
                  const titre = event.target.value;
                  setBrouillon((precedent) => ({
                    ...precedent,
                    titre,
                    // On ne recalcule l'adresse que sur une nouvelle page: changer
                    // celle d'une page publiee casserait les liens existants.
                    adresse: pageEnEdition ? precedent.adresse : adresseDepuisTitre(titre)
                  }));
                }}
                placeholder="À propos de nous"
              />
            </Champ>

            <Champ
              label="Texte de la page"
              aide={
                htmlAvance
                  ? "Contenu avancé — modifiez uniquement le texte visible."
                  : "Écrivez normalement. Laissez une ligne vide entre deux paragraphes. Commencez une ligne par un tiret « - » pour faire une liste."
              }
            >
              <ChampZoneTexte
                rows={14}
                value={brouillon.texte}
                onChange={(event) => setBrouillon((precedent) => ({ ...precedent, texte: event.target.value }))}
                placeholder={"Anata Store est votre boutique de téléphones à Treichville.\n\nNous proposons :\n- des smartphones neufs garantis\n- une livraison rapide à Abidjan"}
              />
            </Champ>

            <Interrupteur
              label="Publier cette page"
              aide="Une page non publiée reste invisible pour vos clients."
              actif={brouillon.publiee}
              onChange={(valeur) => setBrouillon((precedent) => ({ ...precedent, publiee: valeur }))}
            />

            <div className="flex flex-col gap-3 border-t-2 border-slate-100 pt-5 sm:flex-row-reverse">
              <Bouton type="submit" disabled={enregistrement} pleineLargeur>
                {enregistrement ? "Enregistrement..." : "Enregistrer la page"}
              </Bouton>
              <Bouton
                type="button"
                variant="secondaire"
                onClick={() => {
                  setVue("liste");
                  setPageEnEdition(null);
                  setErreur("");
                }}
                disabled={enregistrement}
                pleineLargeur
              >
                Annuler
              </Bouton>
            </div>
          </form>
        </Carte>
      </div>
    );
  }

  /* --- Liste ------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      <TitrePage
        titre="Mes pages"
        sousTitre="Les textes fixes de votre site : présentation, livraison, conditions."
        action={<Bouton onClick={ouvrirCreation}>Créer une page</Bouton>}
      />

      {succes && <Message type="succes">{succes}</Message>}
      {erreur && <Message type="erreur">{erreur}</Message>}

      {chargement && <Chargement texte="Chargement de vos pages..." />}

      {!chargement && pages.length === 0 && (
        <EtatVide
          titre="Aucune page pour l'instant"
          texte="Créez par exemple une page « À propos » pour présenter votre boutique à vos clients."
          action={<Bouton onClick={ouvrirCreation}>Créer ma première page</Bouton>}
        />
      )}

      {!chargement && pages.length > 0 && (
        <ul className="space-y-3">
          {pages.map((page) => (
            <li key={page.id}>
              <Carte>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[1.15rem] font-bold text-ink">{page.title}</h2>
                    <p className="mt-1 text-[1rem] text-slate-600">
                      {page.is_published ? "Visible par vos clients" : "Brouillon — non visible"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border-2 px-3 py-1 text-[0.95rem] font-bold ${
                      page.is_published
                        ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                        : "border-slate-300 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {page.is_published ? "Publiée" : "Brouillon"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-slate-100 pt-3">
                  <Bouton variant="secondaire" onClick={() => ouvrirEdition(page)}>
                    Modifier
                  </Bouton>
                  <Bouton variant="danger" onClick={() => setPageASupprimer(page)}>
                    Supprimer
                  </Bouton>
                </div>
              </Carte>
            </li>
          ))}
        </ul>
      )}

      {pageASupprimer && (
        <Confirmation
          titre="Supprimer cette page ?"
          texte={`La page « ${pageASupprimer.title} » sera définitivement effacée. Cette action ne peut pas être annulée.`}
          libelleConfirmer="Oui, supprimer"
          onConfirmer={confirmerSuppression}
          onAnnuler={() => setPageASupprimer(null)}
          occupe={enregistrement}
        />
      )}
    </div>
  );
}
