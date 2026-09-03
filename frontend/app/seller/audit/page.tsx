"use client";

import { useEffect, useMemo, useState } from "react";

import { Carte, Chargement, EtatVide, Message, TitrePage } from "@/components/boutique/kit";
import { useSellerAuth } from "@/components/seller-auth-provider";
import { fetchSellerAuditLogs } from "@/lib/seller-api";
import { SellerAuditLog } from "@/lib/types";

/**
 * Historique des modifications.
 *
 * Le journal technique est traduit en phrases: « Article ajoute », « Prix modifie »...
 * Il sert au gerant a repondre a « qui a change quoi, et quand ».
 */

const ACTIONS: Record<string, string> = {
  create: "Ajout",
  update: "Modification",
  update_status: "Changement d'état",
  delete: "Suppression",
  soft_delete: "Retrait de la vente",
  login: "Connexion"
};

const RESSOURCES: Record<string, string> = {
  article: "un article",
  product: "un article",
  variant: "une version d'article",
  article_photo: "une photo d'article",
  product_photo: "une photo d'article",
  order: "une commande",
  cod_collection: "un encaissement",
  content_page: "une page du site",
  inventory_item: "un stock",
  blog_post: "un article de blog",
  home_section: "la page d'accueil"
};

function phrase(log: SellerAuditLog) {
  const action = ACTIONS[log.action] || log.action;
  const ressource = RESSOURCES[log.resource] || log.resource;
  return `${action} : ${ressource}`;
}

/** Un repere temporel parlant vaut mieux qu'un horodatage complet. */
function quand(valeur: string) {
  const date = new Date(valeur);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.floor(minutes / 60)} h`;

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

/** Le nom de l'article concerne, quand le journal l'a conserve. */
function detail(log: SellerAuditLog) {
  const source = (log.after_json || log.before_json || {}) as Record<string, unknown>;
  const nom = source.nom ?? source.name;
  return typeof nom === "string" ? nom : "";
}

export default function HistoriquePage() {
  const { token } = useSellerAuth();
  const [logs, setLogs] = useState<SellerAuditLog[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      try {
        setChargement(true);
        setErreur("");
        const payload = await fetchSellerAuditLogs(token);
        setLogs(payload.slice(0, 100));
      } catch {
        setErreur("Impossible de charger l'historique. Vérifiez votre connexion internet.");
      } finally {
        setChargement(false);
      }
    }
    if (token) {
      charger();
    }
  }, [token]);

  const groupes = useMemo(() => {
    const parJour = new Map<string, SellerAuditLog[]>();
    for (const log of logs) {
      const jour = new Date(log.created_at).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
      parJour.set(jour, [...(parJour.get(jour) || []), log]);
    }
    return Array.from(parJour.entries());
  }, [logs]);

  return (
    <div className="space-y-6">
      <TitrePage
        titre="Historique"
        sousTitre="Les 100 dernières modifications faites sur votre boutique."
      />

      {erreur && <Message type="erreur">{erreur}</Message>}
      {chargement && <Chargement texte="Chargement de l'historique..." />}

      {!chargement && logs.length === 0 && !erreur && (
        <EtatVide
          titre="Aucune modification enregistrée"
          texte="Dès que vous ajouterez ou modifierez un article, l'opération apparaîtra ici."
        />
      )}

      {!chargement &&
        groupes.map(([jour, entrees]) => (
          <Carte key={jour}>
            <h2 className="font-display text-xl capitalize text-ink">{jour}</h2>
            <ul className="mt-3 divide-y-2 divide-slate-100">
              {entrees.map((log) => (
                <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <span className="text-[1.05rem] text-slate-800">
                    <span className="font-bold text-ink">{phrase(log)}</span>
                    {detail(log) && <span className="text-slate-600"> — {detail(log)}</span>}
                  </span>
                  <span className="text-[1rem] text-slate-500">{quand(log.created_at)}</span>
                </li>
              ))}
            </ul>
          </Carte>
        ))}
    </div>
  );
}
