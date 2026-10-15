"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { LoadingSpinner } from "@/components/loading-spinner";
import { addToCart } from "@/lib/api";
import { formatFcfa } from "@/lib/currency";
import { availabilityLabel } from "@/lib/labels";
import { readCompareItems, upsertCompareItem } from "@/lib/compare";
import { Product } from "@/lib/types";

function fcfa(value: number) {
  return formatFcfa(value);
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

/** Le nom lisible d'une version: « 256 Go », « 256 Go - Noir », sinon rien. */
function libelleVersion(attrs: { storage?: string; color?: string; ram?: string }) {
  return [attrs.storage, attrs.color, attrs.ram ? `${attrs.ram} RAM` : ""].filter(Boolean).join(" · ");
}

/**
 * Versions disponibles en boutique (couleurs, capacites).
 *
 * Les capacites qui portent un prix sont choisies plus bas, dans la liste des
 * versions: on ne les repete pas ici, sinon le client voit deux listes.
 */
function ProductVersions({
  couleurs,
  capacites
}: {
  couleurs: Array<{ nom: string; code: string }>;
  capacites: string[];
}) {
  if (couleurs.length === 0 && capacites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {couleurs.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Couleurs disponibles</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {couleurs.map((couleur) => (
              <li
                key={couleur.nom}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[0.95rem] text-slate-700"
              >
                {couleur.code && (
                  <span
                    aria-hidden
                    className="h-4 w-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: couleur.code }}
                  />
                )}
                {couleur.nom}
              </li>
            ))}
          </ul>
        </div>
      )}

      {capacites.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capacités disponibles</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {capacites.map((capacite) => (
              <li
                key={capacite}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[0.95rem] font-semibold text-slate-700"
              >
                {capacite}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[0.95rem] text-slate-600">
        Nous confirmons avec vous la version souhaitée lors de l&apos;appel de confirmation.
      </p>
    </div>
  );
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
      setMessage("Ajouté à votre panier.");
    } catch {
      setError("Impossible d'ajouter cet article au panier.");
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

  const activePrice = selectedVariant
    ? selectedVariant.promo_price_amount ?? selectedVariant.price_amount
    : null;

  // Plusieurs capacites a des prix differents: le choix se fait ici, pas au telephone.
  const capacitesChoisissables =
    new Set(product.variants.map((variant) => summarizeAttributes(variant.attributes).storage).filter(Boolean))
      .size > 1;
  // Une seule version: rien a choisir, on affiche simplement le prix.
  const choixUnique = product.variants.length === 1 ? product.variants[0] : null;
  const libelleSelection = selectedVariant ? libelleVersion(summarizeAttributes(selectedVariant.attributes)) : "";

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 pb-24 lg:pb-6">
      <div>
        <h1 className="font-display text-3xl">{product.name}</h1>
        <p className="mt-2 text-sm text-slate-600">{product.short_description}</p>
      </div>

      <ProductVersions
        couleurs={product.couleurs_disponibles ?? []}
        capacites={capacitesChoisissables ? [] : product.capacites_disponibles ?? []}
      />

      {choixUnique ? (
        <div>
          <p className="text-2xl font-semibold text-fuel">
            {fcfa(choixUnique.promo_price_amount ?? choixUnique.price_amount)}
          </p>
          <p className="text-sm text-slate-500">{availabilityLabel(choixUnique.availability.status)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[0.95rem] font-semibold text-slate-700">
            {capacitesChoisissables ? "Choisissez la capacité" : "Choisissez votre version"}
          </p>
          {product.variants.map((variant) => {
            const attrs = summarizeAttributes(variant.attributes);
            const libelle = libelleVersion(attrs);
            const active = variant.id === selectedVariant?.id;
            return (
              <button
                key={variant.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedVariantId(variant.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-cyan-500 bg-gradient-to-br from-[#0f172a] to-[#1f2937] ring-1 ring-cyan-300/70 shadow-[0_10px_22px_-14px_rgba(15,23,42,0.7)]"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span>
                  <span className={`block text-base font-semibold ${active ? "text-white" : "text-ink"}`}>
                    {libelle || "Version standard"}
                  </span>
                  <span className={`block text-xs ${active ? "text-fuel" : "text-slate-500"}`}>
                    {availabilityLabel(variant.availability.status)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block text-base font-semibold ${active ? "text-white" : "text-fuel"}`}>
                    {fcfa(variant.promo_price_amount ?? variant.price_amount)}
                  </span>
                  {variant.promo_price_amount != null && (
                    <span className={`block text-xs line-through ${active ? "text-fuel/80" : "text-slate-400"}`}>
                      {fcfa(variant.price_amount)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => pushToCart(false)}
          disabled={!selectedVariant || busy !== ""}
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "cart" ? (
            <>
              <LoadingSpinner className="text-white" />
              Ajout...
            </>
          ) : (
            "Ajouter au panier"
          )}
        </button>
        <button
          type="button"
          onClick={() => pushToCart(true)}
          disabled={!selectedVariant || busy !== ""}
          className="inline-flex items-center gap-2 rounded-xl bg-fuel px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "buy" ? (
            <>
              <LoadingSpinner className="text-white" />
              Préparation...
            </>
          ) : (
            "Acheter maintenant"
          )}
        </button>
        <button
          type="button"
          onClick={addToCompare}
          disabled={!selectedVariant || busy !== ""}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "compare" ? (
            <>
              <LoadingSpinner className="text-slate-700" />
              Ajout...
            </>
          ) : (
            `Comparer (${compareCount})`
          )}
        </button>
        <Link href="/cart" className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
          Aller au panier
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <div
        role="region"
        aria-label="Actions d'achat rapide"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pr-20 pt-3 shadow-[0_-12px_24px_-18px_rgba(15,23,42,0.55)] backdrop-blur-md lg:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">
              {libelleSelection || product.name}
            </p>
            <p className="truncate text-base font-semibold text-fuel">
              {activePrice !== null ? fcfa(activePrice) : "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => pushToCart(false)}
            disabled={!selectedVariant || busy !== ""}
            aria-label="Ajouter au panier"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "cart" ? (
              <LoadingSpinner className="text-white" />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => pushToCart(true)}
            disabled={!selectedVariant || busy !== ""}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-fuel px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "buy" ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner className="text-white" />
                ...
              </span>
            ) : (
              "Acheter"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
