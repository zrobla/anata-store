"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildCategoryTree, getTopBrands } from "@/lib/navigation";
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
          <p className="tracking-wide text-slate-300">ANATA STORE - Premium smartphones & devices</p>
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
          <div className="flex items-center gap-2">
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
              className="flex items-center overflow-hidden rounded-xl bg-white px-3 py-1.5 shadow-md ring-1 ring-white/60 border border-fuel/25"
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

          <nav className="ml-auto flex items-center gap-2 md:hidden">
            <Link href="/s?q=samsung" className="rounded-lg border border-slate-500 px-2 py-1 text-xs">
              Search
            </Link>
            <Link href="/cart" className="rounded-lg border border-slate-500 px-2 py-1 text-xs">
              Panier
            </Link>
          </nav>
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
            <button type="submit" className="bg-fuel px-4 text-xs font-semibold text-white">
              Go
            </button>
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
          <aside className="fixed left-0 top-0 z-[71] h-screen w-[88%] max-w-sm overflow-y-auto bg-white shadow-2xl md:hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="font-display text-xl text-slate-900">Navigation</p>
              <button
                type="button"
                onClick={closeMenu}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700"
              >
                Fermer
              </button>
            </div>

            <div className="border-b border-slate-200 px-4 py-3">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMobileTab("categories")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    mobileTab === "categories" ? "bg-white text-slate-900 shadow" : "text-slate-600"
                  }`}
                >
                  Categories
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("brands")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    mobileTab === "brands" ? "bg-white text-slate-900 shadow" : "text-slate-600"
                  }`}
                >
                  Marques
                </button>
              </div>
            </div>

            {mobileTab === "categories" && (
              <div className="space-y-1 px-3 py-3">
                <Link
                  href="/s?q=samsung"
                  onClick={closeMenu}
                  className="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  Tout le catalogue
                </Link>
                {categoryTree.map((node) => {
                  const expanded = expandedCategoryId === node.category.id;
                  return (
                    <div key={node.category.id} className="rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
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
                        <div className="grid gap-1 border-t border-slate-100 px-3 py-2">
                          {node.children.map((child) => (
                            <Link
                              key={child.category.id}
                              href={`/c/${child.category.slug}`}
                              onClick={closeMenu}
                              className="rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
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
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Categories indisponibles.</p>
                )}
              </div>
            )}

            {mobileTab === "brands" && (
              <div className="grid gap-1 px-3 py-3">
                {topBrands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/b/${brand.slug}`}
                    onClick={closeMenu}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  >
                    {brand.name}
                  </Link>
                ))}
                {topBrands.length === 0 && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Marques indisponibles.</p>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 px-3 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Liens rapides</p>
              <div className="grid gap-1">
                <Link href="/compare" onClick={closeMenu} className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Comparer
                </Link>
                <Link href="/cart" onClick={closeMenu} className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Panier
                </Link>
                <Link
                  href="/account/orders"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Mes commandes
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
