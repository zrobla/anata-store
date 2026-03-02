import Link from "next/link";

import { fetchBrands, fetchCategories } from "@/lib/api";
import { getTopBrands } from "@/lib/navigation";
import { Category } from "@/lib/types";

type CatalogShellProps = {
  children: React.ReactNode;
  activeCategorySlug?: string;
  categories?: Category[];
};

export async function CatalogShell({ children, activeCategorySlug, categories }: CatalogShellProps) {
  const [list, brands] = await Promise.all([
    categories ? Promise.resolve(categories) : fetchCategories().catch(() => []),
    fetchBrands().catch(() => [])
  ]);
  const quickBrands = getTopBrands(brands, 8);
  const allCatalogActive = !activeCategorySlug;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-32 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.55)]">
            <div className="bg-gradient-to-r from-ink via-slate-900 to-cyan-900 px-4 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Navigation</p>
              <h2 className="mt-1 font-display text-xl">Tout le catalogue</h2>
            </div>
            <nav className="grid gap-1.5 p-3">
              <Link
                href="/s?q=samsung"
                className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  allCatalogActive
                    ? "border-cyan-300 bg-cyan-50/90 text-cyan-900 shadow-sm"
                    : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>Tout le catalogue</span>
                <span className="text-xs text-slate-400 group-hover:text-cyan-700">{">"}</span>
              </Link>
              {list.map((category) => {
                const active = activeCategorySlug === category.slug;
                return (
                  <Link
                    key={category.id}
                    href={`/c/${category.slug}`}
                    className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                      active
                        ? "border-cyan-300 bg-cyan-50/90 text-cyan-900 shadow-sm"
                        : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{category.name}</span>
                    <span className="text-xs text-slate-400 group-hover:text-cyan-700">{">"}</span>
                  </Link>
                );
              })}
              {list.length === 0 && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Categories indisponibles.</p>
              )}
            </nav>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)]">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Marques premium</h3>
            <nav className="mt-3 grid gap-1.5">
              {quickBrands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/b/${brand.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50/70 hover:text-slate-900"
                >
                  <span className="truncate">{brand.name}</span>
                  <span className="text-xs text-slate-400 group-hover:text-cyan-700">+</span>
                </Link>
              ))}
              {quickBrands.length === 0 && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Marques indisponibles.</p>
              )}
            </nav>
          </div>

          <div className="rounded-2xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-white p-4 text-xs text-cyan-950 shadow-[0_10px_24px_-18px_rgba(6,182,212,0.8)]">
            <p className="font-semibold uppercase tracking-wide">Conseil Anata</p>
            <p className="mt-1">
              Utilise d'abord le comparateur pour aligner stockage, autonomie et budget avant d'ajouter au panier.
            </p>
          </div>
        </div>
      </aside>

      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
