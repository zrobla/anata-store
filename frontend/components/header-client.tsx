"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildCategoryTree, getTopBrands } from "@/lib/navigation";
import { STORE_ADDRESS_SHORT, STORE_MAP_URL } from "@/lib/store-info";
import { Brand, Category } from "@/lib/types";

type HeaderClientProps = {
  categories: Category[];
  brands: Brand[];
};

export function HeaderClient({ categories, brands }: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"categories" | "brands">("categories");
  const [expandedCategoryId, setExpandedCategoryId] = useState("");

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const topBrands = useMemo(() => getTopBrands(brands, 12), [brands]);

  useEffect(() => {
    if (mobileMenuOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [mobileMenuOpen]);

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategoryId((current) => (current === categoryId ? "" : categoryId));
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="hidden border-b border-slate-700 bg-slate-900 text-slate-200 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-xs">
          <p className="tracking-wide text-slate-300">
            ANATA STORE - Boutique en Ligne premium + boutique physique au {STORE_ADDRESS_SHORT}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/pages/contact" className="hover:text-white">
              Aide & Support
            </Link>
            <Link href="/account/orders" className="hover:text-white">
              Mes commandes
            </Link>
            <Link href="/seller" className="hover:text-white">
              Seller Studio
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-white/20 bg-ink/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-mist">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-500 text-slate-200 md:hidden"
              aria-label="Ouvrir le menu"
            >
              <span className="text-lg leading-none">☰</span>
            </button>
            <Link
              href="/"
              className="hidden items-center overflow-hidden rounded-xl border border-fuel/25 bg-white px-3 py-1.5 shadow-md ring-1 ring-white/60 md:flex"
            >
              <Image
                src="/anata-store-logo-1.png"
                alt="Anata Store"
                width={228}
                height={70}
                className="h-11 w-auto scale-[1.75] object-contain sm:h-12"
                priority
              />
            </Link>
          </div>

          <Link
            href="/"
            className="mx-auto flex items-center overflow-hidden rounded-xl border border-fuel/25 bg-white px-3 py-1.5 shadow-md ring-1 ring-white/60 md:hidden"
          >
            <Image
              src="/anata-store-logo-1.png"
              alt="Anata Store"
              width={228}
              height={70}
              className="h-11 w-auto scale-[1.75] object-contain sm:h-12"
              priority
            />
          </Link>

          <form
            action="/s"
            method="get"
            className="hidden grid-cols-[1fr_auto] overflow-hidden rounded-xl border border-slate-500 bg-white text-slate-900 md:grid"
          >
            <input
              type="search"
              name="q"
              placeholder="Rechercher un smartphone, une tablette, une montre..."
              className="w-full border-0 px-3 py-2 text-sm outline-none"
            />
            <button type="submit" className="bg-fuel px-4 text-sm font-semibold text-white">
              Rechercher
            </button>
          </form>

          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link href="/account/orders">Compte</Link>
            <Link href="/compare">Comparer</Link>
            <Link href="/cart" className="rounded-lg border border-slate-500 px-3 py-1.5">
              Panier
            </Link>
          </nav>

          <div className="h-9 w-9 md:hidden" aria-hidden="true" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <form
            action="/s"
            method="get"
            className="grid grid-cols-[1fr_auto] overflow-hidden rounded-xl border border-slate-500 bg-white text-slate-900"
          >
            <input
              type="search"
              name="q"
              placeholder="Rechercher..."
              className="w-full border-0 px-3 py-2 text-sm outline-none"
            />
            <button type="submit" className="bg-fuel px-4 text-xs font-semibold text-white">OK</button>
          </form>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={closeMenu}
            className="fixed inset-0 z-[70] bg-black/45 md:hidden"
          />
          <aside className="fixed left-0 top-0 z-[71] h-screen w-[88%] max-w-sm overflow-y-auto border-r border-slate-200 bg-slate-50 shadow-2xl md:hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-ink via-slate-900 to-cyan-900 px-4 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Menu</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-display text-xl">Navigation</p>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="rounded-lg border border-white/30 px-2 py-1 text-sm text-white/95"
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMobileTab("categories")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    mobileTab === "categories"
                      ? "bg-ink text-white shadow-[0_6px_16px_-10px_rgba(15,23,42,0.85)]"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Categories
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("brands")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    mobileTab === "brands"
                      ? "bg-ink text-white shadow-[0_6px_16px_-10px_rgba(15,23,42,0.85)]"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Marques
                </button>
              </div>
            </div>

            {mobileTab === "categories" && (
              <div className="space-y-1.5 px-3 py-3">
                <Link
                  href="/s?q=samsung"
                  onClick={closeMenu}
                  className="block rounded-xl border border-cyan-600 bg-cyan-100 px-3 py-2 text-sm font-semibold text-cyan-950"
                >
                  Tout le catalogue
                </Link>
                {categoryTree.map((node) => {
                  const expanded = expandedCategoryId === node.category.id;
                  return (
                    <div key={node.category.id} className="rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <Link
                          href={`/c/${node.category.slug}`}
                          onClick={closeMenu}
                          className="min-w-0 flex-1 text-sm font-semibold text-slate-800"
                        >
                          {node.category.name}
                        </Link>
                        {node.children.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleCategory(node.category.id)}
                            className="rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-700"
                            aria-label={expanded ? "Masquer sous-categories" : "Afficher sous-categories"}
                          >
                            {expanded ? "-" : "+"}
                          </button>
                        )}
                      </div>
                      {expanded && node.children.length > 0 && (
                        <div className="grid gap-1 border-t border-slate-100 bg-slate-50 px-3 py-2">
                          {node.children.map((child) => (
                            <Link
                              key={child.category.id}
                              href={`/c/${child.category.slug}`}
                              onClick={closeMenu}
                              className="rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-white"
                            >
                              {child.category.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {categoryTree.length === 0 && (
                  <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">Categories indisponibles.</p>
                )}
              </div>
            )}

            {mobileTab === "brands" && (
              <div className="grid gap-1.5 px-3 py-3">
                {topBrands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/b/${brand.slug}`}
                    onClick={closeMenu}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50/70"
                  >
                    {brand.name}
                  </Link>
                ))}
                {topBrands.length === 0 && (
                  <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">Marques indisponibles.</p>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 bg-white px-3 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Liens rapides</p>
              <div className="grid gap-1.5">
                <Link
                  href="/s"
                  onClick={closeMenu}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Rechercher
                </Link>
                <Link
                  href="/compare"
                  onClick={closeMenu}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Comparer
                </Link>
                <Link
                  href="/cart"
                  onClick={closeMenu}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Panier
                </Link>
                <Link
                  href="/account/orders"
                  onClick={closeMenu}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Mes commandes
                </Link>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Boutique physique</p>
                <p className="mt-1 text-xs text-slate-700">{STORE_ADDRESS_SHORT}</p>
                <a
                  href={STORE_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                >
                  Ouvrir Maps
                </a>
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
