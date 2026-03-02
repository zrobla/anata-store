import Link from "next/link";

import { STORE_ADDRESS_SHORT, STORE_NAME, STORE_OPENING_HOURS_LABEL } from "@/lib/store-info";

const links = [
  { href: "/pages/livraison", label: "Livraison" },
  { href: "/pages/retours", label: "Retours" },
  { href: "/pages/garantie", label: "Garantie" },
  { href: "/pages/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" }
];

const trustPoints = [
  "Produits 100% verifies",
  "Paiement COD securise",
  "Livraison rapide CI",
  "Support client reactif",
  "Qualite produit controlee avant livraison"
];

export function Footer() {
  return (
    <footer className="relative mt-14 overflow-hidden border-t border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-slate-100">
      <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-fuel/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl gap-5 px-4 py-6 md:grid-cols-[1.2fr_0.9fr_1fr]">
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Boutique en ligne + physique</p>
          <div>
            <p className="font-display text-xl text-white">{STORE_NAME}</p>
            <p className="mt-0.5 text-sm text-slate-300">
              Smartphones et accessoires premium avec experience d'achat claire, rapide et fiable.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Boutique physique</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{STORE_ADDRESS_SHORT}</p>
            <p className="text-xs text-slate-300">{STORE_OPENING_HOURS_LABEL}</p>
          </div>
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Navigation utile</p>
          <div className="mt-2.5 grid gap-1.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Engagement premium</p>
          <div className="mt-2.5 grid gap-1.5">
            {trustPoints.map((point) => (
              <p
                key={point}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-100"
              >
                {point}
              </p>
            ))}
          </div>
        </section>
      </div>

      <div className="relative border-t border-white/10 bg-slate-950/45 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-xs text-slate-300 md:flex-row md:items-center md:justify-between">
          <p>© 2026 {STORE_NAME}. Tous droits reserves.</p>
          <p>
            Concepteur du site web:{" "}
            <a
              href="https://tech-and-web.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:text-cyan-200"
            >
              Tech &amp; Web
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
