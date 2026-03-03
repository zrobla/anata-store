"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useSellerAuth } from "@/components/seller-auth-provider";
import { formatFcfa } from "@/lib/currency";
import {
  createSellerProduct,
  createSellerVariant,
  deleteSellerProduct,
  deleteSellerVariant,
  downloadSellerProductImportTemplate,
  fetchSellerBrands,
  fetchSellerCategories,
  fetchSellerProducts,
  fetchSellerVariants,
  importSellerProductsExcel,
  updateSellerProduct,
  updateSellerVariant
} from "@/lib/seller-api";
import {
  SellerBrand,
  SellerCategory,
  SellerProduct,
  SellerProductImportReport,
  SellerVariant
} from "@/lib/types";

type ProductForm = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  short_description: string;
  description: string;
  is_active: boolean;
  is_featured: boolean;
  badges: string;
  seo_title: string;
  seo_description: string;
};

type VariantForm = {
  product: string;
  sku: string;
  barcode: string;
  price_amount: string;
  promo_price_amount: string;
  is_active: boolean;
};

const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "",
  slug: "",
  brand: "",
  category: "",
  short_description: "",
  description: "",
  is_active: true,
  is_featured: false,
  badges: "",
  seo_title: "",
  seo_description: ""
};

const EMPTY_VARIANT_FORM: VariantForm = {
  product: "",
  sku: "",
  barcode: "",
  price_amount: "",
  promo_price_amount: "",
  is_active: true
};

function parseBadges(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function SellerProductsPage() {
  const { token } = useSellerAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [variants, setVariants] = useState<SellerVariant[]>([]);
  const [brands, setBrands] = useState<SellerBrand[]>([]);
  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [createForm, setCreateForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [editProductId, setEditProductId] = useState("");
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [variantCreateForm, setVariantCreateForm] = useState<VariantForm>(EMPTY_VARIANT_FORM);
  const [editVariantId, setEditVariantId] = useState("");
  const [variantEditForm, setVariantEditForm] = useState<VariantForm>(EMPTY_VARIANT_FORM);
  const [downloadTemplateLoading, setDownloadTemplateLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<SellerProductImportReport | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [productsPayload, variantsPayload, brandsPayload, categoriesPayload] = await Promise.all([
        fetchSellerProducts(token),
        fetchSellerVariants(token),
        fetchSellerBrands(),
        fetchSellerCategories()
      ]);
      setProducts(productsPayload);
      setVariants(variantsPayload);
      setBrands(brandsPayload);
      setCategories(categoriesPayload);

      const firstBrandId = brandsPayload[0]?.id || "";
      const firstCategoryId = categoriesPayload[0]?.id || "";
      const firstProductId = productsPayload[0]?.id || "";
      setCreateForm((prev) => ({
        ...prev,
        brand: prev.brand || firstBrandId,
        category: prev.category || firstCategoryId
      }));
      setVariantCreateForm((prev) => ({ ...prev, product: prev.product || firstProductId }));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Impossible de charger les produits seller.";
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return products;
    }
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q) ||
        product.seo_title.toLowerCase().includes(q)
    );
  }, [products, query]);

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, SellerVariant[]>();
    variants.forEach((variant) => {
      const current = map.get(variant.product) || [];
      current.push(variant);
      map.set(variant.product, current);
    });
    return map;
  }, [variants]);

  const brandNameById = useMemo(() => new Map(brands.map((item) => [item.id, item.name])), [brands]);
  const categoryNameById = useMemo(
    () => new Map(categories.map((item) => [item.id, item.name])),
    [categories]
  );

  function startEditProduct(product: SellerProduct) {
    setEditProductId(product.id);
    setEditForm({
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      category: product.category,
      short_description: product.short_description || "",
      description: product.description || "",
      is_active: product.is_active,
      is_featured: product.is_featured,
      badges: product.badges.join(", "),
      seo_title: product.seo_title || "",
      seo_description: product.seo_description || ""
    });
    setError("");
    setNotice("");
  }

  function startEditVariant(variant: SellerVariant) {
    setEditVariantId(variant.id);
    setVariantEditForm({
      product: variant.product,
      sku: variant.sku,
      barcode: variant.barcode || "",
      price_amount: String(variant.price_amount),
      promo_price_amount: variant.promo_price_amount === null ? "" : String(variant.promo_price_amount),
      is_active: variant.is_active
    });
    setError("");
    setNotice("");
  }

  async function onDownloadTemplate() {
    try {
      setDownloadTemplateLoading(true);
      setError("");
      setNotice("");
      const blob = await downloadSellerProductImportTemplate(token);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "anata_product_import_template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setNotice("Modele Excel telecharge.");
    } catch (downloadError) {
      const message =
        downloadError instanceof Error ? downloadError.message : "Telechargement du modele impossible.";
      setError(message);
    } finally {
      setDownloadTemplateLoading(false);
    }
  }

  async function onImportExcel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile) {
      setError("Selectionnez un fichier .xlsx avant import.");
      return;
    }

    try {
      setImportLoading(true);
      setError("");
      setNotice("");
      const report = await importSellerProductsExcel(token, importFile);
      setImportReport(report);
      if (report.errors.length > 0) {
        setNotice(
          `Import termine avec ${report.errors.length} erreur(s). ${report.processed_rows} ligne(s) traitee(s).`
        );
      } else {
        setNotice(`Import termine. ${report.processed_rows} ligne(s) traitee(s) sans erreur.`);
      }
      await loadData();
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Import Excel impossible.";
      setError(message);
    } finally {
      setImportLoading(false);
    }
  }

  async function onCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await createSellerProduct(token, {
        name: createForm.name.trim(),
        slug: createForm.slug.trim(),
        brand: createForm.brand,
        category: createForm.category,
        short_description: createForm.short_description.trim(),
        description: createForm.description.trim(),
        is_active: createForm.is_active,
        is_featured: createForm.is_featured,
        badges: parseBadges(createForm.badges),
        seo_title: createForm.seo_title.trim(),
        seo_description: createForm.seo_description.trim()
      });
      setCreateForm((prev) => ({ ...EMPTY_PRODUCT_FORM, brand: prev.brand, category: prev.category }));
      setNotice("Produit cree.");
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Creation produit impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpdateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editProductId) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await updateSellerProduct(token, editProductId, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim(),
        brand: editForm.brand,
        category: editForm.category,
        short_description: editForm.short_description.trim(),
        description: editForm.description.trim(),
        is_active: editForm.is_active,
        is_featured: editForm.is_featured,
        badges: parseBadges(editForm.badges),
        seo_title: editForm.seo_title.trim(),
        seo_description: editForm.seo_description.trim()
      });
      setEditProductId("");
      setNotice("Produit mis a jour.");
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Mise a jour produit impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteProduct(productId: string) {
    if (!window.confirm("Desactiver ce produit ?")) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await deleteSellerProduct(token, productId);
      setNotice("Produit desactive.");
      if (editProductId === productId) {
        setEditProductId("");
      }
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Suppression produit impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onCreateVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await createSellerVariant(token, {
        product: variantCreateForm.product,
        sku: variantCreateForm.sku.trim(),
        barcode: variantCreateForm.barcode.trim(),
        price_amount: Number(variantCreateForm.price_amount || 0),
        promo_price_amount: variantCreateForm.promo_price_amount
          ? Number(variantCreateForm.promo_price_amount)
          : null,
        is_active: variantCreateForm.is_active
      });
      setVariantCreateForm((prev) => ({ ...EMPTY_VARIANT_FORM, product: prev.product }));
      setNotice("Variante creee.");
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Creation variante impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpdateVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editVariantId) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await updateSellerVariant(token, editVariantId, {
        product: variantEditForm.product,
        sku: variantEditForm.sku.trim(),
        barcode: variantEditForm.barcode.trim(),
        price_amount: Number(variantEditForm.price_amount || 0),
        promo_price_amount: variantEditForm.promo_price_amount
          ? Number(variantEditForm.promo_price_amount)
          : null,
        is_active: variantEditForm.is_active
      });
      setEditVariantId("");
      setNotice("Variante mise a jour.");
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Mise a jour variante impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteVariant(variantId: string) {
    if (!window.confirm("Supprimer cette variante ?")) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await deleteSellerVariant(token, variantId);
      if (editVariantId === variantId) {
        setEditVariantId("");
      }
      setNotice("Variante supprimee.");
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Suppression variante impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Produits</h1>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher nom / slug / SEO"
        className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
      />
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>
      )}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Chargement...</p>}

      {!loading && (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-display text-xl">Import Excel produits</h2>
            <p className="mt-1 text-xs text-slate-500">
              Modele en francais. Colonnes obligatoires: <code>nom_produit</code>, <code>slug_marque</code>,{" "}
              <code>slug_categorie</code>, <code>sku_variante</code>, <code>prix_fcfa</code>.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onDownloadTemplate}
                disabled={downloadTemplateLoading || importLoading}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
              >
                {downloadTemplateLoading ? "Telechargement..." : "Telecharger modele Excel"}
              </button>
              <form onSubmit={onImportExcel} className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  className="max-w-xs rounded-lg border px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={importLoading || !importFile}
                  className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  {importLoading ? "Import en cours..." : "Importer le fichier"}
                </button>
              </form>
            </div>

            {importReport && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Rapport d'import</p>
                <p className="mt-1">
                  Lignes detectees: {importReport.total_rows} | Lignes traitees: {importReport.processed_rows} |
                  Lignes vides ignorees: {importReport.skipped_empty_rows}
                </p>
                <p className="mt-1">
                  Crees: produits {importReport.created.products}, variantes {importReport.created.variants}, sources{" "}
                  {importReport.created.inventory_sources}, stocks {importReport.created.inventory_items}, medias{" "}
                  {importReport.created.media_assets}, liens medias {importReport.created.media_links}
                </p>
                <p className="mt-1">
                  Maj: produits {importReport.updated.products}, variantes {importReport.updated.variants}, sources{" "}
                  {importReport.updated.inventory_sources}, stocks {importReport.updated.inventory_items}
                </p>
                {importReport.errors.length > 0 && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                    <p className="font-semibold">
                      Erreurs ({importReport.errors.length}) - corrigez le fichier puis reimportez
                    </p>
                    <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-xs">
                      {importReport.errors.map((item, index) => (
                        <li key={`${item.row}-${index}`}>
                          Ligne {item.row}: {item.error}
                          {item.variant_sku ? ` (SKU ${item.variant_sku})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-display text-xl">Creer un produit</h2>
            <form onSubmit={onCreateProduct} className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                required
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nom produit"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                required
                value={createForm.slug}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="Slug (sam-s26-ultra)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <select
                required
                value={createForm.brand}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, brand: event.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={createForm.category}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                value={createForm.short_description}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, short_description: event.target.value }))}
                placeholder="Description courte"
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              />
              <textarea
                rows={3}
                value={createForm.description}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description longue"
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              />
              <input
                value={createForm.badges}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, badges: event.target.value }))}
                placeholder="Badges (virgules)"
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              />
              <input
                value={createForm.seo_title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, seo_title: event.target.value }))}
                placeholder="SEO title"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={createForm.seo_description}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, seo_description: event.target.value }))}
                placeholder="SEO description"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Actif
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.is_featured}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, is_featured: event.target.checked }))}
                />
                Featured
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60 md:col-span-2"
              >
                Creer le produit
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_70px_70px_70px] gap-2 border-b border-slate-200 pb-2 text-xs font-semibold uppercase text-slate-500">
              <p>Produit</p>
              <p>Slug</p>
              <p>Marque / Categorie</p>
              <p>Actif</p>
              <p>Feat.</p>
              <p>Vars</p>
            </div>
            {filtered.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-[1.1fr_1fr_1fr_70px_70px_70px] gap-2 border-b border-slate-100 py-2 text-xs text-slate-700 last:border-b-0"
              >
                <p className="truncate">{product.name}</p>
                <p className="truncate">{product.slug}</p>
                <p className="truncate">
                  {(brandNameById.get(product.brand) || product.brand) +
                    " / " +
                    (categoryNameById.get(product.category) || product.category)}
                </p>
                <p>{product.is_active ? "Oui" : "Non"}</p>
                <p>{product.is_featured ? "Oui" : "Non"}</p>
                <p>{variantsByProduct.get(product.id)?.length || 0}</p>
                <div className="col-span-6 flex flex-wrap gap-2 pb-2">
                  <button
                    type="button"
                    onClick={() => startEditProduct(product)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    Editer
                  </button>
                  <button
                    type="button"
                    onClick={() => setVariantCreateForm((prev) => ({ ...prev, product: product.id }))}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    Ajouter variante
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteProduct(product.id)}
                    disabled={saving}
                    className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
                  >
                    Desactiver
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="py-3 text-sm text-slate-600">Aucun produit.</p>}
          </section>

          {editProductId && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Editer produit</h2>
                <button
                  type="button"
                  onClick={() => setEditProductId("")}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                >
                  Fermer
                </button>
              </div>
              <form onSubmit={onUpdateProduct} className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  required
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nom"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  required
                  value={editForm.slug}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="Slug"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <select
                  required
                  value={editForm.brand}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={editForm.category}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  value={editForm.short_description}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, short_description: event.target.value }))}
                  placeholder="Description courte"
                  className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
                />
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Description longue"
                  className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
                />
                <input
                  value={editForm.badges}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, badges: event.target.value }))}
                  placeholder="Badges (virgules)"
                  className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
                />
                <input
                  value={editForm.seo_title}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, seo_title: event.target.value }))}
                  placeholder="SEO title"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  value={editForm.seo_description}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, seo_description: event.target.value }))}
                  placeholder="SEO description"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  Actif
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.is_featured}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, is_featured: event.target.checked }))}
                  />
                  Featured
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60 md:col-span-2"
                >
                  Enregistrer le produit
                </button>
              </form>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-display text-xl">Variantes</h2>
            <form onSubmit={onCreateVariant} className="mt-3 grid gap-3 md:grid-cols-3">
              <select
                required
                value={variantCreateForm.product}
                onChange={(event) => setVariantCreateForm((prev) => ({ ...prev, product: event.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <input
                required
                value={variantCreateForm.sku}
                onChange={(event) => setVariantCreateForm((prev) => ({ ...prev, sku: event.target.value }))}
                placeholder="SKU"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={variantCreateForm.barcode}
                onChange={(event) => setVariantCreateForm((prev) => ({ ...prev, barcode: event.target.value }))}
                placeholder="Barcode"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                required
                type="number"
                min={0}
                value={variantCreateForm.price_amount}
                onChange={(event) => setVariantCreateForm((prev) => ({ ...prev, price_amount: event.target.value }))}
                placeholder="Prix"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={variantCreateForm.promo_price_amount}
                onChange={(event) =>
                  setVariantCreateForm((prev) => ({ ...prev, promo_price_amount: event.target.value }))
                }
                placeholder="Prix promo"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={variantCreateForm.is_active}
                  onChange={(event) =>
                    setVariantCreateForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                />
                Active
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60 md:col-span-3"
              >
                Creer la variante
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {variants.map((variant) => (
                <div key={variant.id} className="rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                  <p className="font-semibold">{variant.sku}</p>
                  <p className="text-slate-500">
                    {(products.find((product) => product.id === variant.product)?.name || variant.product) +
                      " - " +
                      formatFcfa(variant.price_amount)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditVariant(variant)}
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    >
                      Editer
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteVariant(variant.id)}
                      disabled={saving}
                      className="rounded-lg border border-red-300 px-2 py-1 text-red-700 disabled:opacity-60"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
              {variants.length === 0 && <p className="text-sm text-slate-600">Aucune variante.</p>}
            </div>
          </section>

          {editVariantId && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Editer variante</h2>
                <button
                  type="button"
                  onClick={() => setEditVariantId("")}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                >
                  Fermer
                </button>
              </div>
              <form onSubmit={onUpdateVariant} className="mt-3 grid gap-3 md:grid-cols-3">
                <select
                  required
                  value={variantEditForm.product}
                  onChange={(event) => setVariantEditForm((prev) => ({ ...prev, product: event.target.value }))}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  value={variantEditForm.sku}
                  onChange={(event) => setVariantEditForm((prev) => ({ ...prev, sku: event.target.value }))}
                  placeholder="SKU"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  value={variantEditForm.barcode}
                  onChange={(event) => setVariantEditForm((prev) => ({ ...prev, barcode: event.target.value }))}
                  placeholder="Barcode"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  required
                  type="number"
                  min={0}
                  value={variantEditForm.price_amount}
                  onChange={(event) => setVariantEditForm((prev) => ({ ...prev, price_amount: event.target.value }))}
                  placeholder="Prix"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={variantEditForm.promo_price_amount}
                  onChange={(event) =>
                    setVariantEditForm((prev) => ({ ...prev, promo_price_amount: event.target.value }))
                  }
                  placeholder="Prix promo"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={variantEditForm.is_active}
                    onChange={(event) => setVariantEditForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  Active
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60 md:col-span-3"
                >
                  Enregistrer la variante
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
