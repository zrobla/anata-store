import Link from "next/link";

const links = [
  { href: "/pages/livraison", label: "Livraison" },
  { href: "/pages/retours", label: "Retours" },
  { href: "/pages/garantie", label: "Garantie" },
  { href: "/pages/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" }
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-5 px-4 py-8 text-sm text-slate-700">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-ink">
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
