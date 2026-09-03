"use client";

/**
 * Briques d'interface du studio boutique.
 *
 * Regles de conception, valables partout dans /seller:
 * - taille de texte confortable (jamais en dessous de 1rem sur les textes de lecture);
 * - zones tactiles d'au moins 48px: le gerant travaille souvent au telephone;
 * - une couleur = un sens (vert en vente, orange attention, rouge probleme, gris inactif);
 * - aucun terme technique visible.
 */

import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { ArticleDisponibilite } from "@/lib/types";

/* --- Boutons ---------------------------------------------------------- */

type ButtonVariant = "principal" | "secondaire" | "danger" | "discret";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  principal: "bg-fuel text-white shadow-sm hover:bg-orange-600 focus-visible:outline-fuel",
  secondaire: "border-2 border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50",
  danger: "border-2 border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
  discret: "text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
};

type BoutonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  pleineLargeur?: boolean;
  icone?: ReactNode;
};

export function Bouton({
  variant = "principal",
  pleineLargeur = false,
  icone,
  className = "",
  children,
  ...props
}: BoutonProps) {
  const base =
    variant === "discret"
      ? "inline-flex min-h-[44px] items-center gap-2 text-[1rem] font-semibold transition disabled:opacity-50"
      : "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-6 text-[1.05rem] font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <button
      className={`${base} ${BUTTON_STYLES[variant]} ${pleineLargeur ? "w-full" : ""} ${className}`}
      {...props}
    >
      {icone}
      {children}
    </button>
  );
}

/* --- Champs de formulaire --------------------------------------------- */

const FIELD_CLASS =
  "w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-[1.05rem] text-ink " +
  "placeholder:text-slate-400 focus:border-fuel focus:outline-none";

type ChampProps = {
  label: string;
  aide?: string;
  requis?: boolean;
  erreur?: string;
  children: ReactNode;
};

/** Un libelle explicite + une aide en langage courant: c'est ce qui evite l'erreur de saisie. */
export function Champ({ label, aide, requis, erreur, children }: ChampProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[1.05rem] font-bold text-ink">
        {label}
        {requis && <span className="ml-1 text-fuel">*</span>}
      </span>
      {aide && <span className="mb-2 block text-[0.98rem] leading-relaxed text-slate-600">{aide}</span>}
      {children}
      {erreur && <span className="mt-1.5 block text-[0.98rem] font-semibold text-rose-700">{erreur}</span>}
    </label>
  );
}

export function ChampTexte({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_CLASS} ${className}`} {...props} />;
}

export function ChampZoneTexte({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_CLASS} ${className}`} {...props} />;
}

export function ChampListe({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${FIELD_CLASS} ${className}`} {...props} />;
}

/** Montant en francs CFA: le suffixe evite toute ambiguite sur l'unite. */
export function ChampMontant({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        step={100}
        inputMode="numeric"
        className={`${FIELD_CLASS} pr-20 ${className}`}
        {...props}
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[1.05rem] font-bold text-slate-500">
        FCFA
      </span>
    </div>
  );
}

/** Interrupteur oui/non: plus lisible qu'une case a cocher pour une decision importante. */
export function Interrupteur({
  label,
  aide,
  actif,
  onChange,
  disabled
}: {
  label: string;
  aide?: string;
  actif: boolean;
  onChange: (valeur: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      disabled={disabled}
      onClick={() => onChange(!actif)}
      className={`flex w-full items-center justify-between gap-4 rounded-2xl border-2 p-4 text-left transition disabled:opacity-50 ${
        actif ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <span>
        <span className="block text-[1.05rem] font-bold text-ink">{label}</span>
        {aide && <span className="mt-0.5 block text-[0.98rem] leading-relaxed text-slate-600">{aide}</span>}
      </span>
      <span
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${actif ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
            actif ? "left-7" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

/* --- Retours a l'utilisateur ------------------------------------------ */

export function Message({ type, children }: { type: "succes" | "erreur" | "info"; children: ReactNode }) {
  const styles = {
    succes: "border-emerald-300 bg-emerald-50 text-emerald-900",
    erreur: "border-rose-300 bg-rose-50 text-rose-900",
    info: "border-sky-300 bg-sky-50 text-sky-900"
  }[type];

  return (
    <p
      role={type === "erreur" ? "alert" : "status"}
      className={`rounded-2xl border-2 p-4 text-[1.05rem] font-semibold leading-relaxed ${styles}`}
    >
      {children}
    </p>
  );
}

export function Carte({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-3xl border-2 border-slate-200 bg-white p-5 md:p-6 ${className}`}>{children}</section>
  );
}

export function TitrePage({ titre, sousTitre, action }: { titre: string; sousTitre?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">{titre}</h1>
        {sousTitre && <p className="mt-2 max-w-2xl text-[1.1rem] leading-relaxed text-slate-600">{sousTitre}</p>}
      </div>
      {action}
    </header>
  );
}

/** Ecran vide utile: il explique quoi faire, il ne se contente pas de constater. */
export function EtatVide({
  titre,
  texte,
  action
}: {
  titre: string;
  texte: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-display text-2xl text-ink">{titre}</p>
      <p className="mx-auto mt-2 max-w-md text-[1.05rem] leading-relaxed text-slate-600">{texte}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Chargement({ texte = "Chargement en cours..." }: { texte?: string }) {
  return (
    <p className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-[1.05rem] font-semibold text-slate-600">
      {texte}
    </p>
  );
}

/* --- Etat d'un article ------------------------------------------------- */

const DISPONIBILITE: Record<ArticleDisponibilite, { texte: string; classe: string }> = {
  EN_VENTE: { texte: "En vente", classe: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  STOCK_BAS: { texte: "Bientôt épuisé", classe: "bg-amber-100 text-amber-900 border-amber-300" },
  EPUISE: { texte: "Épuisé", classe: "bg-rose-100 text-rose-900 border-rose-300" },
  HORS_LIGNE: { texte: "Retiré du site", classe: "bg-slate-100 text-slate-700 border-slate-300" }
};

export function EtiquetteDisponibilite({ etat }: { etat: ArticleDisponibilite }) {
  const { texte, classe } = DISPONIBILITE[etat] ?? DISPONIBILITE.HORS_LIGNE;
  return (
    <span className={`inline-flex rounded-full border-2 px-3 py-1 text-[0.95rem] font-bold ${classe}`}>{texte}</span>
  );
}

/* --- Confirmation d'action sensible ------------------------------------ */

export function Confirmation({
  titre,
  texte,
  libelleConfirmer,
  onConfirmer,
  onAnnuler,
  occupe
}: {
  titre: string;
  texte: string;
  libelleConfirmer: string;
  onConfirmer: () => void;
  onAnnuler: () => void;
  occupe?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="font-display text-2xl text-ink">{titre}</h2>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-slate-700">{texte}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <Bouton variant="danger" onClick={onConfirmer} disabled={occupe} pleineLargeur>
            {occupe ? "Un instant..." : libelleConfirmer}
          </Bouton>
          <Bouton variant="secondaire" onClick={onAnnuler} disabled={occupe} pleineLargeur>
            Annuler
          </Bouton>
        </div>
      </div>
    </div>
  );
}

export function LienBouton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-fuel px-6 text-[1.05rem] font-bold text-white transition hover:bg-orange-600"
    >
      {children}
    </Link>
  );
}
