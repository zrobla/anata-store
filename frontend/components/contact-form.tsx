"use client";

import { FormEvent, useMemo, useState } from "react";

type ContactSubject =
  | "PRODUCT_ADVICE"
  | "ORDER_TRACKING"
  | "AFTER_SALES"
  | "DELIVERY"
  | "PARTNERSHIP"
  | "OTHER";

type ContactFormState = {
  full_name: string;
  phone: string;
  email: string;
  subject: ContactSubject;
  order_number: string;
  product_model: string;
  budget_fcfa: string;
  message: string;
};

const SUBJECT_OPTIONS: Array<{ value: ContactSubject; label: string }> = [
  { value: "PRODUCT_ADVICE", label: "Conseil achat smartphone" },
  { value: "ORDER_TRACKING", label: "Suivi de commande" },
  { value: "AFTER_SALES", label: "Garantie / SAV" },
  { value: "DELIVERY", label: "Question livraison" },
  { value: "PARTNERSHIP", label: "Partenariat / B2B" },
  { value: "OTHER", label: "Autre demande" }
];

const INITIAL_STATE: ContactFormState = {
  full_name: "",
  phone: "",
  email: "",
  subject: "PRODUCT_ADVICE",
  order_number: "",
  product_model: "",
  budget_fcfa: "",
  message: ""
};

export function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(INITIAL_STATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const needsOrderNumber = form.subject === "ORDER_TRACKING";
  const needsProductModel = form.subject === "PRODUCT_ADVICE" || form.subject === "AFTER_SALES";
  const needsBudget = form.subject === "PRODUCT_ADVICE";

  const minMessageHint = useMemo(() => {
    if (form.subject === "PRODUCT_ADVICE") {
      return "Decris ton usage, ton budget et ce que tu priorises (batterie, photo, stockage...).";
    }
    if (form.subject === "ORDER_TRACKING") {
      return "Indique ton numero de commande et ton besoin precis.";
    }
    return "Explique ta demande en quelques lignes.";
  }, [form.subject]);

  function setField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone,
          email: form.email || undefined,
          subject: form.subject,
          order_number: needsOrderNumber ? form.order_number : undefined,
          product_model: needsProductModel ? form.product_model : undefined,
          budget_fcfa: needsBudget ? form.budget_fcfa : undefined,
          message: form.message
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; ticket_id?: string }
        | null;
      if (!response.ok) {
        setError(payload?.message || "Echec d'envoi du formulaire. Reessaie.");
        return;
      }

      setSuccess(
        payload?.ticket_id
          ? `Demande envoyee. Ticket ${payload.ticket_id}. Notre equipe te recontacte rapidement.`
          : "Demande envoyee. Notre equipe te recontacte rapidement."
      );
      setForm(INITIAL_STATE);
    } catch {
      setError("Echec d'envoi du formulaire. Verifie ta connexion puis reessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-slate-700">
          Nom complet
          <input
            required
            value={form.full_name}
            onChange={(event) => setField("full_name", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            placeholder="Ex: Koffi Kouame"
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Telephone / WhatsApp
          <input
            required
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            placeholder="+225 ..."
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-slate-700">
          Email (optionnel)
          <input
            type="email"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            placeholder="email@exemple.com"
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Objet
          <select
            value={form.subject}
            onChange={(event) => setField("subject", event.target.value as ContactSubject)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          >
            {SUBJECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {needsOrderNumber && (
        <label className="grid gap-1 text-sm text-slate-700">
          Numero de commande
          <input
            required
            value={form.order_number}
            onChange={(event) => setField("order_number", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            placeholder="Ex: ANATA-20260302-0001"
          />
        </label>
      )}

      {needsProductModel && (
        <label className="grid gap-1 text-sm text-slate-700">
          Modele concerne
          <input
            required
            value={form.product_model}
            onChange={(event) => setField("product_model", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            placeholder="Ex: Galaxy S25 Ultra 512GB"
          />
        </label>
      )}

      {needsBudget && (
        <label className="grid gap-1 text-sm text-slate-700">
          Budget approximatif (FCFA)
          <input
            required
            value={form.budget_fcfa}
            onChange={(event) => setField("budget_fcfa", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            placeholder="Ex: 450000"
          />
        </label>
      )}

      <label className="grid gap-1 text-sm text-slate-700">
        Message
        <textarea
          required
          minLength={12}
          value={form.message}
          onChange={(event) => setField("message", event.target.value)}
          className="min-h-[130px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          placeholder={minMessageHint}
        />
      </label>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex justify-center rounded-xl bg-fuel px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Envoi..." : "Envoyer la demande"}
      </button>
    </form>
  );
}
