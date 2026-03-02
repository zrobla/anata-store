"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { addToCart } from "@/lib/api";
import { readCompareItems, upsertCompareItem } from "@/lib/compare";
import { Product } from "@/lib/types";

function fcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

function summarizeAttributes(
  attrs: Array<{ attribute_key: string; value: string; label: string }>
): { storage?: string; color?: string; ram?: string } {
  const map = Object.fromEntries(attrs.map((attr) => [attr.attribute_key, attr.label || attr.value]));
  return {
    storage: map.storage,
    color: map.color,
    ram: map.ram
  };
}

export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const firstSelectableVariant =
    product.variants.find((variant) => variant.availability.status !== "OUT_OF_STOCK") || product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(firstSelectableVariant?.id || "");
  const [busy, setBusy] = useState<"" | "cart" | "buy" | "compare">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [compareCount, setCompareCount] = useState(() => readCompareItems().length);

  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variant.id === selectedVariantId) || firstSelectableVariant,
    [firstSelectableVariant, product.variants, selectedVariantId]
  );

  async function pushToCart(redirectToCheckout: boolean) {
    if (!selectedVariant) {
      return;
    }
    try {
      setBusy(redirectToCheckout ? "buy" : "cart");
      setError("");
      setMessage("");
      const session = window.localStorage.getItem("cart_session") || "";
      const { session: nextSession } = await addToCart(selectedVariant.id, 1, session);
      if (nextSession) {
        window.localStorage.setItem("cart_session", nextSession);
      }
      if (redirectToCheckout) {
        router.push("/checkout");
        return;
      }
      setMessage("Variante ajoutee au panier.");
    } catch {
      setError("Impossible d'ajouter la variante au panier.");
    } finally {
      setBusy("");
    }
  }

  function addToCompare() {
    if (!selectedVariant) {
      return;
    }
    setBusy("compare");
    setError("");
    setMessage("");
    const items = upsertCompareItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantId: selectedVariant.id,
      variantSku: selectedVariant.sku,
      priceAmount: selectedVariant.price_amount,
      promoPriceAmount: selectedVariant.promo_price_amount,
      availabilityStatus: selectedVariant.availability.status,
      attributes: selectedVariant.attributes
    });
    setCompareCount(items.length);
    setMessage("Produit ajoute au comparateur.");
    setBusy("");
    router.push("/compare");
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <h1 className="font-display text-3xl">{product.name}</h1>
        <p className="mt-2 text-sm text-slate-600">{product.short_description}</p>
      </div>

      <div className="space-y-3">
        {product.variants.map((variant) => {
          const attrs = summarizeAttributes(variant.attributes);
          const active = variant.id === selectedVariant?.id;
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => setSelectedVariantId(variant.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                active ? "border-cyan-500 bg-cyan-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className="text-xs text-slate-500">SKU {variant.sku}</p>
              <p className="font-semibold text-fuel">{fcfa(variant.promo_price_amount ?? variant.price_amount)}</p>
              <p className="text-xs text-slate-600">
                {attrs.storage ? `Stockage: ${attrs.storage}` : "Stockage standard"}{" "}
                {attrs.color ? `- Couleur: ${attrs.color}` : ""} {attrs.ram ? `- RAM: ${attrs.ram}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">{variant.availability.status.replaceAll("_", " ")}</p>
            </button>
          );
        })}
      </div>

      {selectedVariant && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Variante selectionnee: <span className="font-semibold">{selectedVariant.sku}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => pushToCart(false)}
          disabled={!selectedVariant || busy !== ""}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "cart" ? "Ajout..." : "Ajouter au panier"}
        </button>
        <button
          type="button"
          onClick={() => pushToCart(true)}
          disabled={!selectedVariant || busy !== ""}
          className="rounded-xl bg-fuel px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "buy" ? "Preparation..." : "Acheter maintenant"}
        </button>
        <button
          type="button"
          onClick={addToCompare}
          disabled={!selectedVariant || busy !== ""}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "compare" ? "Ajout..." : `Comparer (${compareCount})`}
        </button>
        <Link href="/cart" className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
          Aller au panier
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </section>
  );
}
