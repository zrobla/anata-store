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

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-36 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-display text-xl">Categories</h2>
          <nav className="mt-3 grid gap-1">
            <Link
              href="/s?q=samsung"
              className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Tout le catalogue
            </Link>
            {list.map((category) => {
              const active = activeCategorySlug === category.slug;
              return (
                <Link
                  key={category.id}
                  href={`/c/${category.slug}`}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
            {list.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Categories indisponibles.</p>
            )}
          </nav>
        </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Marques rapides</h3>
            <nav className="mt-2 grid gap-1">
              {quickBrands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/b/${brand.slug}`}
                  className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  {brand.name}
                </Link>
              ))}
              {quickBrands.length === 0 && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Marques indisponibles.</p>
              )}
            </nav>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs text-cyan-900">
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
