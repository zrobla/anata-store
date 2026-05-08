"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function OrderSuccessPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D+/g, "");
  const waMessage = `Bonjour Anata Store, je viens de passer une commande (référence ${orderId}). Pouvez-vous confirmer la livraison ?`;
  const waHref = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`
    : null;

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <h1 className="font-display text-3xl text-emerald-900">Commande confirmée</h1>
      <p className="mt-2 text-sm text-emerald-900">
        Merci pour ta commande&nbsp;! Notre équipe te contactera très vite pour confirmer la livraison à l&apos;adresse renseignée.
      </p>

      <div className="mt-4 rounded-xl border border-emerald-300 bg-white p-3 text-sm text-emerald-900">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Référence de commande</p>
        <p className="mt-1 font-mono text-base font-semibold text-emerald-900 break-all">{orderId}</p>
        <p className="mt-2 text-xs text-emerald-800">
          Garde cette référence à portée de main. Elle nous permet de retrouver ta commande rapidement par téléphone ou WhatsApp.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-300 bg-white/70 p-3 text-sm text-emerald-900">
        <p className="font-semibold">Prochaines étapes</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-emerald-900">
          <li>Tu reçois un appel ou un message WhatsApp pour confirmer la livraison.</li>
          <li>Le livreur t&apos;appelle avant son arrivée.</li>
          <li>Tu vérifies le produit puis tu paies en espèces (paiement à la livraison).</li>
        </ol>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#128C7E] px-4 py-2 text-sm font-semibold text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 32 32" className="h-4 w-4 fill-current">
              <path d="M16.02 3.2A12.75 12.75 0 0 0 4.6 21.8L3 29l7.37-1.53a12.8 12.8 0 1 0 5.65-24.27Zm0 23.1a10.3 10.3 0 0 1-5.25-1.43l-.37-.22-4.37.9.93-4.24-.24-.4A10.32 10.32 0 1 1 16 26.3Zm5.65-7.73c-.3-.15-1.8-.88-2.08-.98-.28-.1-.48-.15-.68.15s-.78.98-.96 1.18c-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.64-.94-2.25-.24-.58-.5-.5-.68-.5h-.58c-.2 0-.5.07-.75.37s-.98.95-.98 2.3 1 2.66 1.15 2.85c.15.2 1.96 3 4.75 4.2.66.28 1.18.45 1.58.58.66.2 1.27.17 1.75.1.53-.08 1.8-.74 2.05-1.45.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.35Z" />
            </svg>
            Nous écrire sur WhatsApp
          </a>
        )}
        <Link href="/" className="rounded-xl border border-emerald-300 px-4 py-2 text-sm">
          Retour à la boutique
        </Link>
      </div>
    </section>
  );
}
