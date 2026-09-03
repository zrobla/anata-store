"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

import { Bouton, Message } from "@/components/boutique/kit";
import { useSellerAuth } from "@/components/seller-auth-provider";
import {
  deleteArticlePhoto,
  fetchArticlePhotos,
  setArticleMainPhoto,
  uploadArticlePhoto
} from "@/lib/seller-api";
import { ArticlePhoto } from "@/lib/types";

/**
 * Photos d'un article.
 *
 * Le gerant prend ses photos au telephone: on accepte le fichier tel quel et
 * le serveur se charge de le redresser, le redimensionner et l'alleger.
 * L'ordre compte: la premiere photo est celle que voient les clients dans les listes.
 */

const FORMATS_ACCEPTES = "image/jpeg,image/png,image/webp";

export function ArticlePhotos({
  articleId,
  onChangement
}: {
  articleId: string;
  onChangement?: (nombre: number) => void;
}) {
  const { token } = useSellerAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<ArticlePhoto[]>([]);
  const [chargement, setChargement] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [progression, setProgression] = useState({ fait: 0, total: 0 });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  useEffect(() => {
    let annule = false;

    async function charger() {
      try {
        setChargement(true);
        const resultat = await fetchArticlePhotos(token, articleId);
        if (!annule) {
          setPhotos(resultat);
          onChangement?.(resultat.length);
        }
      } catch (error) {
        if (!annule) {
          setErreur(error instanceof Error ? error.message : "Impossible de charger les photos.");
        }
      } finally {
        if (!annule) {
          setChargement(false);
        }
      }
    }

    if (token && articleId) {
      charger();
    }
    return () => {
      annule = true;
    };
    // onChangement est une callback du parent: l'inclure relancerait le chargement a chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, articleId]);

  function appliquer(resultat: ArticlePhoto[], messageSucces: string) {
    setPhotos(resultat);
    setSucces(messageSucces);
    setErreur("");
    onChangement?.(resultat.length);
  }

  async function onFichiersChoisis(event: ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(event.target.files || []);
    if (fichiers.length === 0) {
      return;
    }

    setEnvoiEnCours(true);
    setErreur("");
    setSucces("");
    setProgression({ fait: 0, total: fichiers.length });

    let dernierResultat: ArticlePhoto[] | null = null;
    for (const [index, fichier] of fichiers.entries()) {
      try {
        dernierResultat = await uploadArticlePhoto(token, articleId, fichier);
        setProgression({ fait: index + 1, total: fichiers.length });
      } catch (error) {
        setErreur(error instanceof Error ? error.message : "La photo n'a pas pu être envoyée.");
        break;
      }
    }

    if (dernierResultat) {
      const nombre = dernierResultat.length;
      appliquer(dernierResultat, `Photo${nombre > 1 ? "s" : ""} enregistrée${nombre > 1 ? "s" : ""}.`);
    }

    setEnvoiEnCours(false);
    setProgression({ fait: 0, total: 0 });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function onDefinirPrincipale(photoId: string) {
    try {
      setErreur("");
      appliquer(await setArticleMainPhoto(token, articleId, photoId), "Photo principale mise à jour.");
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Action impossible.");
    }
  }

  async function onSupprimer(photoId: string) {
    try {
      setErreur("");
      appliquer(await deleteArticlePhoto(token, articleId, photoId), "Photo supprimée.");
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[1.05rem] font-bold text-ink">Photos de l&apos;article</p>
        <p className="mt-1 text-[1rem] leading-relaxed text-slate-600">
          Prenez la photo avec votre téléphone puis ajoutez-la ici. La première photo est celle que vos clients
          voient en premier.
        </p>
      </div>

      {erreur && <Message type="erreur">{erreur}</Message>}
      {succes && !erreur && <Message type="succes">{succes}</Message>}

      {chargement ? (
        <p className="text-[1.05rem] text-slate-600">Chargement des photos...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className={`overflow-hidden rounded-2xl border-2 bg-white ${
                photo.is_primary ? "border-fuel" : "border-slate-200"
              }`}
            >
              <div className="relative aspect-square bg-slate-100">
                {/* Images servies depuis le domaine du site: pas d'optimiseur distant a configurer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.alt} className="h-full w-full object-cover" />
                {photo.is_primary && (
                  <span className="absolute left-2 top-2 rounded-full bg-fuel px-2.5 py-1 text-[0.85rem] font-bold text-white">
                    Photo principale
                  </span>
                )}
              </div>
              <figcaption className="flex flex-col gap-1.5 p-2.5">
                {!photo.is_primary && (
                  <button
                    type="button"
                    onClick={() => onDefinirPrincipale(photo.id)}
                    className="min-h-[40px] rounded-xl border-2 border-slate-300 text-[0.95rem] font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Mettre en avant
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSupprimer(photo.id)}
                  className="min-h-[40px] rounded-xl border-2 border-rose-300 text-[0.95rem] font-bold text-rose-700 hover:bg-rose-50"
                >
                  Supprimer
                </button>
              </figcaption>
            </figure>
          ))}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={envoiEnCours}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3 text-center transition hover:border-fuel hover:bg-orange-50 disabled:opacity-60"
          >
            <span aria-hidden className="text-3xl">
              📷
            </span>
            <span className="text-[1rem] font-bold text-slate-700">
              {envoiEnCours
                ? `Envoi ${progression.fait}/${progression.total}...`
                : photos.length === 0
                  ? "Ajouter une photo"
                  : "Ajouter"}
            </span>
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={FORMATS_ACCEPTES}
        multiple
        onChange={onFichiersChoisis}
        className="sr-only"
      />

      {photos.length === 0 && !chargement && (
        <Message type="info">
          Un article avec une belle photo se vend beaucoup mieux. Ajoutez-en au moins une avant de le mettre en ligne.
        </Message>
      )}

      {envoiEnCours && (
        <Bouton variant="secondaire" disabled pleineLargeur>
          Envoi en cours, ne fermez pas cette page...
        </Bouton>
      )}
    </div>
  );
}
