"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BackLink } from "@/components/back-link";
import { LoadingSpinner } from "@/components/loading-spinner";
import { fetchCart, removeCartItem, updateCartItemQty } from "@/lib/api";
import { formatFcfa } from "@/lib/currency";
import { availabilityLabel } from "@/lib/labels";
import { Cart } from "@/lib/types";

function fcfa(value: number) {
  return formatFcfa(value);
}

function total(cart: Cart) {
  return cart.items.reduce((sum, item) => sum + item.qty * item.unit_price_amount, 0);
}

function attrsLabel(item: Cart["items"][number]) {
  const attrs = item.variant_attributes;
  if (!attrs || attrs.length === 0) {
    return "";
  }
  return attrs.map((attr) => `${attr.attribute_key}: ${attr.label || attr.value}`).join(" - ");
}

function whatsappOrderHref(cart: Cart, phone: string): string | null {
  if (!phone || cart.items.length === 0) {
    return null;
  }
  const lines = cart.items.map((item) => {
    const label = item.product_name || item.variant_sku;
    const attrs = attrsLabel(item);
    const subtotal = formatFcfa(item.qty * item.unit_price_amount);
    return `- ${label}${attrs ? ` (${attrs})` : ""} x${item.qty} = ${subtotal}`;
  });
  const totalLine = `Total: ${formatFcfa(total(cart))}`;
  const message = [
    "Bonjour Anata Store, je souhaite finaliser cette commande:",
    "",
    ...lines,
    "",
    totalLine,
    "",
    "Pouvez-vous confirmer la disponibilite et la livraison ?"
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState("");
  const [busyItemId, setBusyItemId] = useState("");

  async function loadCart() {
    try {
      setError("");
      const session = localStorage.getItem("cart_session") || "";
      const { cart: payload, session: nextSession } = await fetchCart(session);
      setCart(payload);
      if (nextSession) {
        localStorage.setItem("cart_session", nextSession);
      }
    } catch {
      setError("Impossible de charger le panier. Vérifie que backend et frontend sont démarrés.");
      setCart({ id: "", currency: "XOF", items: [] });
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function changeQty(itemId: string, qty: number) {
    if (qty < 1) {
      return;
    }
    try {
      setBusyItemId(itemId);
      setError("");
      const session = localStorage.getItem("cart_session") || "";
      const { cart: payload, session: nextSession } = await updateCartItemQty(itemId, qty, session);
      setCart(payload);
      if (nextSession) {
        localStorage.setItem("cart_session", nextSession);
      }
    } catch {
      setError("Mise a jour de quantite impossible.");
    } finally {
      setBusyItemId("");
    }
  }

  async function removeItem(itemId: string) {
    try {
      setBusyItemId(itemId);
      setError("");
      const session = localStorage.getItem("cart_session") || "";
      const { cart: payload, session: nextSession } = await removeCartItem(itemId, session);
      setCart(payload);
      if (nextSession) {
        localStorage.setItem("cart_session", nextSession);
      }
    } catch {
      setError("Suppression de l'article impossible.");
    } finally {
      setBusyItemId("");
    }
  }

  if (!cart) {
    return <p className="rounded-xl bg-white p-4">Chargement du panier...</p>;
  }

  return (
    <section className="space-y-4">
      <BackLink fallbackHref="/" label="Retour boutique" />
      <h1 className="font-display text-3xl">Panier</h1>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" onClick={loadCart} className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-xs">
            Reessayer
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {cart.items.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Votre panier est vide.</p>
            <Link href="/s" className="inline-flex rounded-lg bg-ink px-3 py-2 text-sm text-white">
              Parcourir les produits
            </Link>
          </div>
        )}

        {cart.items.map((item) => (
          <div key={item.id} className="space-y-2 border-b border-slate-100 py-3 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.product_name || item.variant_sku}</p>
                <p className="text-xs text-slate-500">SKU {item.variant_sku}</p>
                {attrsLabel(item) && <p className="text-xs text-slate-600">{attrsLabel(item)}</p>}
                <p className="text-xs text-slate-500">{availabilityLabel(item.availability.status)}</p>
              </div>
              <p className="text-sm font-semibold text-fuel">{fcfa(item.qty * item.unit_price_amount)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => changeQty(item.id, item.qty - 1)}
                disabled={busyItemId === item.id || item.qty <= 1}
                className="inline-flex min-w-7 items-center justify-center rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
              >
                {busyItemId === item.id ? <LoadingSpinner className="text-slate-600" /> : "-"}
              </button>
              <span className="min-w-6 text-center text-sm">{item.qty}</span>
              <button
                type="button"
                onClick={() => changeQty(item.id, item.qty + 1)}
                disabled={busyItemId === item.id}
                className="inline-flex min-w-7 items-center justify-center rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
              >
                {busyItemId === item.id ? <LoadingSpinner className="text-slate-600" /> : "+"}
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={busyItemId === item.id}
                className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-700 disabled:opacity-50"
              >
                {busyItemId === item.id ? (
                  <>
                    <LoadingSpinner className="text-red-700" />
                    Retrait...
                  </>
                ) : (
                  "Retirer"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-right text-lg font-semibold">Total: {fcfa(total(cart))}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/checkout" className="inline-flex rounded-xl bg-fuel px-4 py-2 text-sm font-semibold text-white">
          Passer a la commande COD
        </Link>
        {(() => {
          const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D+/g, "");
          const href = whatsappOrderHref(cart, phone);
          if (!href) {
            return null;
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#128C7E] px-4 py-2 text-sm font-semibold text-white"
            >
              <svg aria-hidden="true" viewBox="0 0 32 32" className="h-4 w-4 fill-current">
                <path d="M16.02 3.2A12.75 12.75 0 0 0 4.6 21.8L3 29l7.37-1.53a12.8 12.8 0 1 0 5.65-24.27Zm0 23.1a10.3 10.3 0 0 1-5.25-1.43l-.37-.22-4.37.9.93-4.24-.24-.4A10.32 10.32 0 1 1 16 26.3Zm5.65-7.73c-.3-.15-1.8-.88-2.08-.98-.28-.1-.48-.15-.68.15s-.78.98-.96 1.18c-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.64-.94-2.25-.24-.58-.5-.5-.68-.5h-.58c-.2 0-.5.07-.75.37s-.98.95-.98 2.3 1 2.66 1.15 2.85c.15.2 1.96 3 4.75 4.2.66.28 1.18.45 1.58.58.66.2 1.27.17 1.75.1.53-.08 1.8-.74 2.05-1.45.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.35Z" />
              </svg>
              Finaliser sur WhatsApp
            </a>
          );
        })()}
        <Link href="/s" className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm">
          Continuer les achats
        </Link>
      </div>
    </section>
  );
}
