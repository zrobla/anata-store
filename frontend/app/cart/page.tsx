"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BackLink } from "@/components/back-link";
import { fetchCart, removeCartItem, updateCartItemQty } from "@/lib/api";
import { Cart } from "@/lib/types";

function fcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
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
      setError("Impossible de charger le panier. Verifie que backend et frontend sont demarres.");
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
            <Link href="/s?q=samsung" className="inline-flex rounded-lg bg-ink px-3 py-2 text-sm text-white">
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
                <p className="text-xs text-slate-500">{item.availability.status.replaceAll("_", " ")}</p>
              </div>
              <p className="text-sm font-semibold text-fuel">{fcfa(item.qty * item.unit_price_amount)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => changeQty(item.id, item.qty - 1)}
                disabled={busyItemId === item.id || item.qty <= 1}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
              >
                -
              </button>
              <span className="min-w-6 text-center text-sm">{item.qty}</span>
              <button
                type="button"
                onClick={() => changeQty(item.id, item.qty + 1)}
                disabled={busyItemId === item.id}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={busyItemId === item.id}
                className="ml-2 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-700 disabled:opacity-50"
              >
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-right text-lg font-semibold">Total: {fcfa(total(cart))}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/checkout" className="inline-flex rounded-xl bg-fuel px-4 py-2 text-sm font-semibold text-white">
          Passer au checkout COD
        </Link>
        <Link href="/s?q=samsung" className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm">
          Continuer les achats
        </Link>
      </div>
    </section>
  );
}
