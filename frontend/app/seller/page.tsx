"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Carte, Chargement, LienBouton, Message, TitrePage } from "@/components/boutique/kit";
import { useSellerAuth } from "@/components/seller-auth-provider";
import { formatFcfa } from "@/lib/currency";
import { fetchArticles, fetchSellerOrders } from "@/lib/seller-api";
import { Article, SellerOrder } from "@/lib/types";

/**
 * Accueil du studio.
 *
 * Il repond a une seule question: « qu'est-ce que je dois faire maintenant ? ».
 * Les chiffres viennent apres les taches, et chaque tache est cliquable.
 */

const STATUTS_A_TRAITER = ["NEW", "CONFIRMED", "PACKING", "OUT_FOR_DELIVERY"];

function debutDuJour() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function AccueilBoutiquePage() {
  const { token, email } = useSellerAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [commandes, setCommandes] = useState<SellerOrder[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      try {
        setChargement(true);
        setErreur("");
        const [listeArticles, listeCommandes] = await Promise.all([
          fetchArticles(token),
          fetchSellerOrders(token)
        ]);
        setArticles(listeArticles);
        setCommandes(listeCommandes);
      } catch {
        setErreur("Impossible de charger votre tableau de bord. Vérifiez votre connexion internet.");
      } finally {
        setChargement(false);
      }
    }
    if (token) {
      charger();
    }
  }, [token]);

  const resume = useMemo(() => {
    const nouvelles = commandes.filter((commande) => commande.status === "NEW");
    const aTraiter = commandes.filter((commande) => STATUTS_A_TRAITER.includes(commande.status));
    const livrees = commandes.filter((commande) => commande.status === "DELIVERED");

    const debut = debutDuJour();
    const duJour = commandes.filter((commande) => new Date(commande.created_at) >= debut);

    return {
      nouvelles,
      aTraiter,
      duJour,
      recettesLivrees: livrees.reduce((total, commande) => total + commande.total_amount, 0),
      enVente: articles.filter((article) => article.disponibilite === "EN_VENTE").length,
      epuises: articles.filter((article) => article.disponibilite === "EPUISE" && article.en_ligne),
      stockBas: articles.filter((article) => article.disponibilite === "STOCK_BAS"),
      sansPhoto: articles.filter((article) => article.en_ligne && article.nombre_photos === 0)
    };
  }, [articles, commandes]);

  /** Les taches du jour, de la plus urgente a la moins urgente. */
  const taches = useMemo(() => {
    const liste: Array<{ cle: string; texte: string; lien: string; ton: "urgent" | "attention" }> = [];

    if (resume.nouvelles.length > 0) {
      liste.push({
        cle: "nouvelles",
        texte: `${resume.nouvelles.length} nouvelle${resume.nouvelles.length > 1 ? "s" : ""} commande${
          resume.nouvelles.length > 1 ? "s" : ""
        } à confirmer par téléphone`,
        lien: "/seller/orders",
        ton: "urgent"
      });
    }

    const enCoursHorsNouvelles = resume.aTraiter.length - resume.nouvelles.length;
    if (enCoursHorsNouvelles > 0) {
      liste.push({
        cle: "en-cours",
        texte: `${enCoursHorsNouvelles} commande${enCoursHorsNouvelles > 1 ? "s" : ""} en cours à faire avancer`,
        lien: "/seller/orders",
        ton: "attention"
      });
    }

    if (resume.epuises.length > 0) {
      liste.push({
        cle: "epuises",
        texte: `${resume.epuises.length} article${resume.epuises.length > 1 ? "s" : ""} en ligne mais épuisé${
          resume.epuises.length > 1 ? "s" : ""
        } : mettez le stock à jour`,
        lien: "/seller/catalog/products",
        ton: "urgent"
      });
    }

    if (resume.stockBas.length > 0) {
      liste.push({
        cle: "stock-bas",
        texte: `${resume.stockBas.length} article${resume.stockBas.length > 1 ? "s" : ""} bientôt épuisé${
          resume.stockBas.length > 1 ? "s" : ""
        } : pensez à réapprovisionner`,
        lien: "/seller/catalog/products",
        ton: "attention"
      });
    }

    if (resume.sansPhoto.length > 0) {
      liste.push({
        cle: "sans-photo",
        texte: `${resume.sansPhoto.length} article${resume.sansPhoto.length > 1 ? "s" : ""} en vente sans photo : ils se vendent mal`,
        lien: "/seller/catalog/products",
        ton: "attention"
      });
    }

    return liste;
  }, [resume]);

  return (
    <div className="space-y-6">
      <TitrePage
        titre="Bonjour 👋"
        sousTitre={email ? `Vous êtes connecté avec ${email}.` : undefined}
        action={<LienBouton href="/seller/catalog/products">Gérer mes articles</LienBouton>}
      />

      {erreur && <Message type="erreur">{erreur}</Message>}
      {chargement && <Chargement texte="Préparation de votre tableau de bord..." />}

      {!chargement && !erreur && (
        <>
          <Carte>
            <h2 className="font-display text-2xl text-ink">À faire aujourd&apos;hui</h2>

            {taches.length === 0 ? (
              <p className="mt-3 text-[1.1rem] leading-relaxed text-emerald-800">
                ✅ Tout est à jour. Aucune commande en attente, aucun article à corriger.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {taches.map((tache) => (
                  <li key={tache.cle}>
                    <Link
                      href={tache.lien}
                      className={`flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border-2 p-4 transition hover:brightness-95 ${
                        tache.ton === "urgent"
                          ? "border-rose-300 bg-rose-50"
                          : "border-amber-300 bg-amber-50"
                      }`}
                    >
                      <span className="text-[1.08rem] font-semibold leading-snug text-ink">{tache.texte}</span>
                      <span aria-hidden className="shrink-0 text-xl font-bold text-slate-500">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Commandes reçues aujourd'hui", valeur: String(resume.duJour.length) },
              { label: "Commandes à traiter", valeur: String(resume.aTraiter.length) },
              { label: "Articles en vente", valeur: String(resume.enVente) },
              { label: "Encaissé sur les commandes livrées", valeur: formatFcfa(resume.recettesLivrees) }
            ].map((carte) => (
              <div key={carte.label} className="rounded-3xl border-2 border-slate-200 bg-white p-5">
                <p className="text-[1rem] leading-snug text-slate-600">{carte.label}</p>
                <p className="mt-2 font-display text-3xl text-ink">{carte.valeur}</p>
              </div>
            ))}
          </div>

          <Carte>
            <h2 className="font-display text-2xl text-ink">Dernières commandes</h2>
            {commandes.length === 0 ? (
              <p className="mt-3 text-[1.05rem] text-slate-600">
                Aucune commande pour le moment. Elles apparaîtront ici dès qu&apos;un client achètera.
              </p>
            ) : (
              <ul className="mt-4 divide-y-2 divide-slate-100">
                {commandes.slice(0, 5).map((commande) => (
                  <li key={commande.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="text-[1.05rem] text-slate-800">
                      {commande.address_json?.full_name || "Client"} ·{" "}
                      <span className="text-slate-500">{commande.order_number}</span>
                    </span>
                    <span className="text-[1.05rem] font-bold text-ink">{formatFcfa(commande.total_amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/seller/orders"
              className="mt-4 inline-flex min-h-[44px] items-center text-[1.05rem] font-bold text-fuel underline underline-offset-4"
            >
              Voir toutes les commandes
            </Link>
          </Carte>
        </>
      )}
    </div>
  );
}
