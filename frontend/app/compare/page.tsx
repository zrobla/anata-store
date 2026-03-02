"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BackLink } from "@/components/back-link";
import { addToCart, fetchProductBySlug } from "@/lib/api";
import { formatFcfa } from "@/lib/currency";
import { availabilityLabel } from "@/lib/labels";
import { CompareItem, clearCompareItems, readCompareItems, removeCompareItem } from "@/lib/compare";
import { Product } from "@/lib/types";

type ComparedProduct = {
  compare: CompareItem;
  product: Product | null;
};

function fcfa(value: number) {
  return formatFcfa(value);
}

function attrLabel(compare: CompareItem, key: string) {
  return compare.attributes.find((attr) => attr.attribute_key === key)?.label || "-";
}

export default function ComparePage() {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingVariantId, setAddingVariantId] = useState("");

  useEffect(() => {
    setItems(readCompareItems());
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [items]);

  const [products, setProducts] = useState<Record<string, Product | null>>({});

  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      const entries = await Promise.all(
        items.map(async (item) => {
          try {
            const product = await fetchProductBySlug(item.productSlug);
            return [item.productSlug, product] as const;
          } catch {
            return [item.productSlug, null] as const;
          }
        })
      );
      if (!mounted) {
        return;
      }
      setProducts(Object.fromEntries(entries));
    }
    if (items.length > 0) {
      loadProducts();
    } else {
      setProducts({});
    }
    return () => {
      mounted = false;
    };
  }, [items]);

  const comparedProducts = useMemo<ComparedProduct[]>(
    () =>
      items.map((compare) => ({
        compare,
        product: products[compare.productSlug] || null
      })),
    [items, products]
  );

  function handleRemove(variantId: string) {
    const next = removeCompareItem(variantId);
    setItems(next);
  }

  function handleClear() {
    setItems(clearCompareItems());
  }

  async function handleAddToCart(item: CompareItem) {
    try {
      setAddingVariantId(item.variantId);
      setError("");
      const session = window.localStorage.getItem("cart_session") || "";
      const { session: nextSession } = await addToCart(item.variantId, 1, session);
      if (nextSession) {
        window.localStorage.setItem("cart_session", nextSession);
      }
    } catch {
      setError("Ajout au panier impossible pour cette variante.");
    } finally {
      setAddingVariantId("");
    }
  }

  if (loading) {
    return <p className="rounded-xl bg-white p-4">Chargement du comparateur...</p>;
  }

  return (
    <section className="space-y-4">
      <BackLink fallbackHref="/s?q=samsung" label="Retour catalogue" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Comparateur</h1>
          <p className="text-sm text-slate-600">Compare jusqu'a 4 variantes produit.</p>
        </div>
        {items.length > 0 && (
          <button type="button" onClick={handleClear} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            Vider le comparateur
          </button>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {items.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>Aucune variante comparee. Ajoute des produits depuis une fiche produit.</p>
          <Link href="/s?q=samsung" className="mt-3 inline-flex rounded-lg bg-ink px-3 py-2 text-xs text-white">
            Aller au catalogue
          </Link>
        </div>
      )}

      {items.length > 0 && items.length < 2 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Ajoute au moins une deuxieme variante pour une comparaison utile.
        </p>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {comparedProducts.map(({ compare, product }) => (
            <article key={compare.variantId} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">{compare.productName}</h2>
              <p className="mt-1 text-xs text-slate-500">SKU {compare.variantSku}</p>
              <p className="mt-2 text-sm font-semibold text-fuel">
                {fcfa(compare.promoPriceAmount ?? compare.priceAmount)}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-slate-700">
                <li>Disponibilite: {availabilityLabel(compare.availabilityStatus)}</li>
                <li>Stockage: {attrLabel(compare, "storage")}</li>
                <li>Couleur: {attrLabel(compare, "color")}</li>
                <li>RAM: {attrLabel(compare, "ram")}</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAddToCart(compare)}
                  disabled={addingVariantId === compare.variantId}
                  className="rounded-lg bg-ink px-3 py-1.5 text-xs text-white disabled:opacity-60"
                >
                  {addingVariantId === compare.variantId ? "Ajout..." : "Ajouter au panier"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(compare.variantId)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                >
                  Retirer
                </button>
                {product && (
                  <Link href={`/p/${product.slug}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs">
                    Voir produit
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
