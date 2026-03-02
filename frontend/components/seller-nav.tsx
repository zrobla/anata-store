import Link from "next/link";

const items = [
  { href: "/seller", label: "Dashboard" },
  { href: "/seller/catalog/products", label: "Produits" },
  { href: "/seller/inventory/items", label: "Stock" },
  { href: "/seller/orders", label: "Commandes" },
  { href: "/seller/content/pages", label: "Contenu" },
  { href: "/seller/audit", label: "Audit" }
];

export function SellerNav({ email, onLogout }: { email?: string; onLogout?: () => void }) {
  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 md:w-64">
      <h2 className="font-display text-lg text-ink">Seller Studio</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-slate-700 hover:text-fuel">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      {email && (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
          Connecte: <span className="font-semibold">{email}</span>
        </p>
      )}
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
        >
          Deconnexion seller
        </button>
      )}
    </aside>
  );
}
