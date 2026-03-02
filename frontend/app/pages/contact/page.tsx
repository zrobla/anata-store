import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { fetchPublicContentPage } from "@/lib/api";
import { STORE_ADDRESS_SHORT, STORE_OPENING_HOURS_LABEL } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contacte Anata Store pour conseil achat, suivi de commande, garantie ou livraison.",
  alternates: {
    canonical: "/pages/contact"
  }
};

export default async function ContactPage() {
  const cmsContactPage = await fetchPublicContentPage("contact").catch(() => null);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contact Anata Store</p>
        <h1 className="mt-2 font-display text-3xl text-ink">Parlons de ton besoin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Notre equipe te repond pour achat, suivi de commande, SAV, garantie ou livraison.
        </p>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Boutique physique</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{STORE_ADDRESS_SHORT}</p>
          <p className="text-xs text-slate-600">{STORE_OPENING_HOURS_LABEL}</p>
        </div>

        {cmsContactPage?.body_html && (
          <article
            className="prose prose-slate mt-5 max-w-none prose-headings:font-display prose-a:text-fuel"
            dangerouslySetInnerHTML={{ __html: cmsContactPage.body_html }}
          />
        )}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Formulaire</p>
        <h2 className="mt-1 font-display text-2xl text-ink">Envoie ta demande</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choisis un objet et complete les champs. Le formulaire adapte les informations selon la demande.
        </p>
        <div className="mt-4">
          <ContactForm />
        </div>
      </article>
    </section>
  );
}
