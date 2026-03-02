"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DEFAULT_MESSAGE =
  "Bonjour Anata Store, je veux des conseils pour choisir mon smartphone selon mon budget.";
const DISMISS_KEY = "whatsapp_cta_dismissed";

function normalizePhone(value: string) {
  return value.replace(/\D+/g, "");
}

export function WhatsAppCta() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  function onDismiss() {
    setDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, "1");
  }

  if (pathname.startsWith("/seller")) {
    return null;
  }

  if (dismissed !== false) {
    return null;
  }

  const phone = normalizePhone(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "");
  if (!phone) {
    return null;
  }

  const prefilled = process.env.NEXT_PUBLIC_WHATSAPP_PREFILL || DEFAULT_MESSAGE;
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(prefilled)}`;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[85] max-w-none md:max-w-[300px]">
      <div className="md:hidden">
        <div className="whatsapp-float pointer-events-auto relative inline-flex">
          <span aria-hidden="true" className="whatsapp-ring absolute inset-0 rounded-full" />
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Parler a un conseiller sur WhatsApp"
            className="whatsapp-button relative inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_16px_30px_-18px_rgba(37,211,102,0.95)]"
          >
            <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 fill-current">
              <path d="M16.02 3.2A12.75 12.75 0 0 0 4.6 21.8L3 29l7.37-1.53a12.8 12.8 0 1 0 5.65-24.27Zm0 23.1a10.3 10.3 0 0 1-5.25-1.43l-.37-.22-4.37.9.93-4.24-.24-.4A10.32 10.32 0 1 1 16 26.3Zm5.65-7.73c-.3-.15-1.8-.88-2.08-.98-.28-.1-.48-.15-.68.15s-.78.98-.96 1.18c-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.64-.94-2.25-.24-.58-.5-.5-.68-.5h-.58c-.2 0-.5.07-.75.37s-.98.95-.98 2.3 1 2.66 1.15 2.85c.15.2 1.96 3 4.75 4.2.66.28 1.18.45 1.58.58.66.2 1.27.17 1.75.1.53-.08 1.8-.74 2.05-1.45.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.35Z" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="whatsapp-hint pointer-events-auto relative mb-2 hidden rounded-2xl border border-emerald-200/70 bg-white/95 p-3 pr-9 text-slate-700 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.85)] backdrop-blur md:block">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer l'aide WhatsApp"
          className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] text-slate-500 transition hover:text-slate-800"
        >
          ×
        </button>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Conseil express</p>
        <p className="mt-1 text-xs">
          Besoin d'aide pour choisir ton smartphone ? Discute avec un conseiller maintenant.
        </p>
      </div>
      <div className="whatsapp-float pointer-events-auto relative hidden md:inline-flex">
        <span aria-hidden="true" className="whatsapp-ring absolute inset-0 rounded-full" />
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Parler a un conseiller sur WhatsApp"
          className="whatsapp-button relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-white shadow-[0_16px_30px_-18px_rgba(37,211,102,0.95)] transition hover:-translate-y-0.5"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-[#128C7E]">
            <svg aria-hidden="true" viewBox="0 0 32 32" className="h-4 w-4 fill-current">
              <path d="M16.02 3.2A12.75 12.75 0 0 0 4.6 21.8L3 29l7.37-1.53a12.8 12.8 0 1 0 5.65-24.27Zm0 23.1a10.3 10.3 0 0 1-5.25-1.43l-.37-.22-4.37.9.93-4.24-.24-.4A10.32 10.32 0 1 1 16 26.3Zm5.65-7.73c-.3-.15-1.8-.88-2.08-.98-.28-.1-.48-.15-.68.15s-.78.98-.96 1.18c-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.64-.94-2.25-.24-.58-.5-.5-.68-.5h-.58c-.2 0-.5.07-.75.37s-.98.95-.98 2.3 1 2.66 1.15 2.85c.15.2 1.96 3 4.75 4.2.66.28 1.18.45 1.58.58.66.2 1.27.17 1.75.1.53-.08 1.8-.74 2.05-1.45.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.35Z" />
            </svg>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold text-emerald-100/95">Support achat</span>
            <span className="font-semibold">Parler sur WhatsApp</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
