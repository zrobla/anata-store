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
import { fetchSellerOrders, updateSellerOrderStatus } from "@/lib/seller-api";
import { SellerOrder, SellerOrderStatus } from "@/lib/types";

/**
 * Commandes.
 *
 * Le gerant suit un parcours, pas une liste d'etats: chaque commande affiche
 * la seule action qui a du sens a cet instant (« Confirmer », « Preparee »,
 * « Remise au livreur », « Livree et payee »). Le paiement se fait a la livraison:
 * l'encaissement est donc confirme en meme temps que la livraison.
 */

const ETAPES: Array<{
  statut: SellerOrderStatus;
  titre: string;
  explication: string;
  actionSuivante?: { libelle: string; vers: SellerOrderStatus };
  couleur: string;
}> = [
  {
    statut: "NEW",
    titre: "Nouvelle commande",
    explication: "Appelez le client pour confirmer sa commande et son adresse.",
    actionSuivante: { libelle: "Le client a confirmé", vers: "CONFIRMED" },
    couleur: "border-sky-300 bg-sky-50"
  },
  {
    statut: "CONFIRMED",
    titre: "Confirmée",
    explication: "Préparez les articles et emballez la commande.",
    actionSuivante: { libelle: "Commande préparée", vers: "PACKING" },
    couleur: "border-indigo-300 bg-indigo-50"
  },
  {
    statut: "PACKING",
    titre: "En préparation",
    explication: "Remettez le colis au livreur quand il est prêt à partir.",
    actionSuivante: { libelle: "Remise au livreur", vers: "OUT_FOR_DELIVERY" },
    couleur: "border-violet-300 bg-violet-50"
  },
  {
    statut: "OUT_FOR_DELIVERY",
    titre: "En livraison",
    explication: "Le livreur encaisse le montant à la remise du colis.",
    actionSuivante: { libelle: "Livrée et payée", vers: "DELIVERED" },
    couleur: "border-amber-300 bg-amber-50"
  },
  {
    statut: "DELIVERED",
    titre: "Livrée et payée",
    explication: "Commande terminée. Rien de plus à faire.",
    couleur: "border-emerald-300 bg-emerald-50"
  },
  {
    statut: "CANCELLED",
    titre: "Annulée",
    explication: "Cette commande a été annulée.",
    couleur: "border-slate-300 bg-slate-50"
  }
];

const ETAPE_PAR_STATUT = new Map(ETAPES.map((etape) => [etape.statut, etape]));

const EN_COURS: SellerOrderStatus[] = ["NEW", "CONFIRMED", "PACKING", "OUT_FOR_DELIVERY"];

function numeroTelephone(commande: SellerOrder) {
  return (commande.address_json?.phone || "").replace(/\s+/g, "");
}

function dateLisible(valeur: string) {
  return new Date(valeur).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function CommandesPage() {
  const { token } = useSellerAuth();
  const [commandes, setCommandes] = useState<SellerOrder[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [commandeOccupee, setCommandeOccupee] = useState("");
  const [onglet, setOnglet] = useState<"EN_COURS" | "TERMINEES">("EN_COURS");
  const [detailOuvert, setDetailOuvert] = useState<string>("");

  const charger = useCallback(
    async function charger(silencieux = false) {
      try {
        if (!silencieux) {
          setChargement(true);
        }
        setErreur("");
        setCommandes(await fetchSellerOrders(token));
      } catch {
        setErreur("Impossible de charger vos commandes. Vérifiez votre connexion internet.");
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

  const { enCours, terminees } = useMemo(() => {
    return {
      enCours: commandes.filter((commande) => EN_COURS.includes(commande.status)),
      terminees: commandes.filter((commande) => !EN_COURS.includes(commande.status))
    };
  }, [commandes]);

  const affichees = onglet === "EN_COURS" ? enCours : terminees;

  async function avancer(commande: SellerOrder, vers: SellerOrderStatus, libelle: string) {
    try {
      setCommandeOccupee(commande.id);
      setErreur("");
      await updateSellerOrderStatus(token, commande.id, vers);
      setCommandes((precedentes) =>
        precedentes.map((item) => (item.id === commande.id ? { ...item, status: vers } : item))
      );
      setSucces(`Commande ${commande.order_number} : ${libelle.toLowerCase()}.`);
    } catch {
      setErreur("La commande n'a pas pu être mise à jour. Réessayez.");
    } finally {
      setCommandeOccupee("");
    }
  }

  async function annuler(commande: SellerOrder) {
    if (!window.confirm(`Annuler la commande ${commande.order_number} ? Cette action ne peut pas être défaite.`)) {
      return;
    }
    await avancer(commande, "CANCELLED", "annulée");
  }

  return (
    <div className="space-y-6">
      <TitrePage
        titre="Commandes"
        sousTitre={
          chargement
            ? undefined
            : enCours.length > 0
              ? `${enCours.length} commande${enCours.length > 1 ? "s" : ""} à traiter aujourd'hui.`
              : "Aucune commande en attente. Tout est à jour."
        }
      />

      {succes && <Message type="succes">{succes}</Message>}
      {erreur && <Message type="erreur">{erreur}</Message>}

      <div className="flex flex-wrap gap-2">
        {[
          { cle: "EN_COURS" as const, label: `À traiter (${enCours.length})` },
          { cle: "TERMINEES" as const, label: `Terminées (${terminees.length})` }
        ].map((item) => (
          <button
            key={item.cle}
            type="button"
            onClick={() => setOnglet(item.cle)}
            className={`min-h-[48px] rounded-full border-2 px-5 text-[1.05rem] font-bold transition ${
              onglet === item.cle
                ? "border-fuel bg-fuel text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {chargement && <Chargement texte="Chargement de vos commandes..." />}

      {!chargement && affichees.length === 0 && (
        <EtatVide
          titre={onglet === "EN_COURS" ? "Aucune commande à traiter" : "Aucune commande terminée"}
          texte={
            onglet === "EN_COURS"
              ? "Dès qu'un client passe commande sur votre boutique, elle apparaît ici."
              : "Les commandes livrées ou annulées seront rangées ici."
          }
        />
      )}

      <ul className="space-y-4">
        {affichees.map((commande) => {
          const etape = ETAPE_PAR_STATUT.get(commande.status);
          const telephone = numeroTelephone(commande);
          const client = commande.address_json?.full_name || "Client";
          const occupee = commandeOccupee === commande.id;
          const detailVisible = detailOuvert === commande.id;

          return (
            <li key={commande.id}>
              <Carte className={`border-2 ${etape?.couleur || ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[1.2rem] font-bold text-ink">{client}</p>
                    <p className="mt-1 text-[1rem] text-slate-600">
                      Commande {commande.order_number} · {dateLisible(commande.created_at)}
                    </p>
                  </div>
                  <p className="text-[1.35rem] font-bold text-fuel">{formatFcfa(commande.total_amount)}</p>
                </div>

                <div className="mt-4 rounded-2xl bg-white/70 p-4">
                  <p className="text-[1.1rem] font-bold text-ink">{etape?.titre || commande.status}</p>
                  <p className="mt-1 text-[1.05rem] leading-relaxed text-slate-700">{etape?.explication}</p>
                </div>

                {/* Le telephone est l'outil principal: un appel confirme la commande plus vite qu'un message. */}
                {telephone && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={`tel:${telephone}`}
                      className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 text-[1.05rem] font-bold text-slate-800 hover:bg-slate-50"
                    >
                      <span aria-hidden>📞</span> Appeler {telephone}
                    </a>
                    <a
                      href={`https://wa.me/${telephone.replace(/^\+/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-white px-5 text-[1.05rem] font-bold text-emerald-800 hover:bg-emerald-50"
                    >
                      <span aria-hidden>💬</span> WhatsApp
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setDetailOuvert(detailVisible ? "" : commande.id)}
                  className="mt-4 min-h-[44px] text-[1.05rem] font-bold text-slate-700 underline underline-offset-4"
                >
                  {detailVisible ? "Masquer le détail" : `Voir le détail (${commande.items.length} article${commande.items.length > 1 ? "s" : ""})`}
                </button>

                {detailVisible && (
                  <div className="mt-3 space-y-3 rounded-2xl bg-white p-4">
                    <ul className="space-y-2">
                      {commande.items.map((ligne) => (
                        <li key={ligne.id} className="flex justify-between gap-3 text-[1.05rem]">
                          <span className="text-slate-800">
                            {ligne.qty} × {ligne.product_snapshot_json?.name || "Article"}
                          </span>
                          <span className="shrink-0 font-bold text-ink">{formatFcfa(ligne.line_total_amount)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="border-t-2 border-slate-100 pt-3 text-[1.05rem]">
                      <p className="flex justify-between text-slate-700">
                        <span>Sous-total</span>
                        <span>{formatFcfa(commande.subtotal_amount)}</span>
                      </p>
                      <p className="mt-1 flex justify-between text-slate-700">
                        <span>Livraison</span>
                        <span>{formatFcfa(commande.delivery_fee_amount)}</span>
                      </p>
                      <p className="mt-2 flex justify-between text-[1.15rem] font-bold text-ink">
                        <span>À encaisser à la livraison</span>
                        <span>{formatFcfa(commande.total_amount)}</span>
                      </p>
                    </div>

                    {commande.address_json?.address_line && (
                      <p className="border-t-2 border-slate-100 pt-3 text-[1.05rem] leading-relaxed text-slate-700">
                        <span className="font-bold text-ink">Adresse de livraison :</span>{" "}
                        {commande.address_json.address_line}
                        {commande.address_json.city ? `, ${commande.address_json.city}` : ""}
                      </p>
                    )}
                  </div>
                )}

                {(etape?.actionSuivante || EN_COURS.includes(commande.status)) && (
                  <div className="mt-4 flex flex-col gap-2 border-t-2 border-white/60 pt-4 sm:flex-row">
                    {etape?.actionSuivante && (
                      <Bouton
                        onClick={() => avancer(commande, etape.actionSuivante!.vers, etape.actionSuivante!.libelle)}
                        disabled={occupee}
                        pleineLargeur
                      >
                        {occupee ? "Enregistrement..." : etape.actionSuivante.libelle}
                      </Bouton>
                    )}
                    <Bouton variant="danger" onClick={() => annuler(commande)} disabled={occupee}>
                      Annuler la commande
                    </Bouton>
                  </div>
                )}
              </Carte>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
