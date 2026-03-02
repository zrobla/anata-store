"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useSellerAuth } from "@/components/seller-auth-provider";
import {
  createSellerInventoryItem,
  deleteSellerInventoryItem,
  fetchSellerInventoryItems,
  fetchSellerInventorySources,
  fetchSellerProducts,
  fetchSellerVariants,
  updateSellerInventoryItem
} from "@/lib/seller-api";
import { SellerInventoryItem, SellerInventorySource, SellerProduct, SellerVariant } from "@/lib/types";

type InventoryForm = {
  variant: string;
  source: string;
  qty_on_hand: string;
  low_stock_threshold: string;
  lead_time_days: string;
};

const EMPTY_FORM: InventoryForm = {
  variant: "",
  source: "",
  qty_on_hand: "0",
  low_stock_threshold: "",
  lead_time_days: ""
};

function nullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return Number(trimmed);
}

export default function SellerInventoryPage() {
  const { token } = useSellerAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<SellerInventoryItem[]>([]);
  const [sources, setSources] = useState<SellerInventorySource[]>([]);
  const [variants, setVariants] = useState<SellerVariant[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [createForm, setCreateForm] = useState<InventoryForm>(EMPTY_FORM);
  const [editItemId, setEditItemId] = useState("");
  const [editForm, setEditForm] = useState<InventoryForm>(EMPTY_FORM);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [itemsPayload, sourcesPayload, variantsPayload, productsPayload] = await Promise.all([
        fetchSellerInventoryItems(token),
        fetchSellerInventorySources(token),
        fetchSellerVariants(token),
        fetchSellerProducts(token)
      ]);
      setItems(itemsPayload);
      setSources(sourcesPayload);
      setVariants(variantsPayload);
      setProducts(productsPayload);

      const firstSourceId = sourcesPayload[0]?.id || "";
      const firstVariantId = variantsPayload[0]?.id || "";
      setCreateForm((prev) => ({
        ...prev,
        source: prev.source || firstSourceId,
        variant: prev.variant || firstVariantId
      }));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Impossible de charger l'inventaire seller.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const lowStockCount = useMemo(
    () =>
      items.filter(
        (item) => item.low_stock_threshold !== null && item.qty_on_hand <= item.low_stock_threshold
      ).length,
    [items]
  );

  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);

  const variantLabelById = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach((variant) => {
      const productName = productById.get(variant.product)?.name || variant.product;
      map.set(variant.id, `${variant.sku} (${productName})`);
    });
    return map;
  }, [productById, variants]);

  const sourceLabelById = useMemo(() => {
    const map = new Map<string, string>();
    sources.forEach((source) => {
      map.set(source.id, `${source.name} (${source.type})`);
    });
    return map;
  }, [sources]);

  function startEdit(item: SellerInventoryItem) {
    setEditItemId(item.id);
    setEditForm({
      variant: item.variant,
      source: item.source,
      qty_on_hand: String(item.qty_on_hand),
      low_stock_threshold: item.low_stock_threshold === null ? "" : String(item.low_stock_threshold),
      lead_time_days: item.lead_time_days === null ? "" : String(item.lead_time_days)
    });
    setError("");
    setNotice("");
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await createSellerInventoryItem(token, {
        variant: createForm.variant,
        source: createForm.source,
        qty_on_hand: Number(createForm.qty_on_hand || 0),
        low_stock_threshold: nullableNumber(createForm.low_stock_threshold),
        lead_time_days: nullableNumber(createForm.lead_time_days)
      });
      setCreateForm((prev) => ({ ...EMPTY_FORM, variant: prev.variant, source: prev.source }));
      setNotice("Item inventaire cree.");
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Creation item inventaire impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editItemId) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await updateSellerInventoryItem(token, editItemId, {
        variant: editForm.variant,
        source: editForm.source,
        qty_on_hand: Number(editForm.qty_on_hand || 0),
        low_stock_threshold: nullableNumber(editForm.low_stock_threshold),
        lead_time_days: nullableNumber(editForm.lead_time_days)
      });
      setEditItemId("");
      setNotice("Item inventaire mis a jour.");
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Mise a jour inventaire impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(itemId: string) {
    if (!window.confirm("Supprimer cet item inventaire ?")) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await deleteSellerInventoryItem(token, itemId);
      if (editItemId === itemId) {
        setEditItemId("");
      }
      setNotice("Item inventaire supprime.");
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Suppression inventaire impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Inventaire</h1>
      <p className="text-sm text-slate-600">Alertes stock: {lowStockCount}</p>
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>
      )}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Chargement...</p>}

      {!loading && (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-display text-xl">Creer un item inventaire</h2>
            <form onSubmit={onCreate} className="mt-3 grid gap-3 md:grid-cols-3">
              <select
                required
                value={createForm.variant}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, variant: event.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variantLabelById.get(variant.id) || variant.id}
                  </option>
                ))}
              </select>
              <select
                required
                value={createForm.source}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, source: event.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {sourceLabelById.get(source.id) || source.id}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={createForm.qty_on_hand}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, qty_on_hand: event.target.value }))}
                placeholder="Quantite"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={createForm.low_stock_threshold}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, low_stock_threshold: event.target.value }))
                }
                placeholder="Seuil low stock"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={createForm.lead_time_days}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, lead_time_days: event.target.value }))}
                placeholder="Delai (jours)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                Creer l'item
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-[1fr_1fr_80px_90px_90px_90px] gap-2 border-b border-slate-200 pb-2 text-xs font-semibold uppercase text-slate-500">
              <p>Variante</p>
              <p>Source</p>
              <p>Qte</p>
              <p>Seuil</p>
              <p>Lead</p>
              <p>Alerte</p>
            </div>
            {items.map((item) => {
              const isLow = item.low_stock_threshold !== null && item.qty_on_hand <= item.low_stock_threshold;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_1fr_80px_90px_90px_90px] gap-2 border-b border-slate-100 py-2 text-xs text-slate-700 last:border-b-0"
                >
                  <p className="truncate">{variantLabelById.get(item.variant) || item.variant}</p>
                  <p className="truncate">{sourceLabelById.get(item.source) || item.source}</p>
                  <p>{item.qty_on_hand}</p>
                  <p>{item.low_stock_threshold === null ? "-" : item.low_stock_threshold}</p>
                  <p>{item.lead_time_days === null ? "-" : item.lead_time_days}</p>
                  <p className={isLow ? "text-red-700" : "text-emerald-700"}>{isLow ? "LOW" : "OK"}</p>
                  <div className="col-span-6 flex flex-wrap gap-2 pb-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      Editer
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      disabled={saving}
                      className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && <p className="py-3 text-sm text-slate-600">Aucun item inventaire.</p>}
          </section>

          {editItemId && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Editer item inventaire</h2>
                <button
                  type="button"
                  onClick={() => setEditItemId("")}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                >
                  Fermer
                </button>
              </div>
              <form onSubmit={onUpdate} className="mt-3 grid gap-3 md:grid-cols-3">
                <select
                  required
                  value={editForm.variant}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, variant: event.target.value }))}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variantLabelById.get(variant.id) || variant.id}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={editForm.source}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, source: event.target.value }))}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {sourceLabelById.get(source.id) || source.id}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={editForm.qty_on_hand}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, qty_on_hand: event.target.value }))}
                  placeholder="Quantite"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={editForm.low_stock_threshold}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, low_stock_threshold: event.target.value }))}
                  placeholder="Seuil low stock"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={editForm.lead_time_days}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, lead_time_days: event.target.value }))}
                  placeholder="Delai (jours)"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  Enregistrer l'item
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
