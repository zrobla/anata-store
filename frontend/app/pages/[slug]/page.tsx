import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fetchPublicContentPage } from "@/lib/api";
import { humanizeSlug } from "@/lib/seo";

type StaticPageProps = { params: Promise<{ slug: string }> };

function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({ params }: StaticPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPublicContentPage(slug).catch(() => null);
  const fallbackTitle = humanizeSlug(slug);

  if (!page) {
    return {
      title: `${fallbackTitle} introuvable`,
      description: `La page ${fallbackTitle} est introuvable.`,
      robots: { index: false, follow: false }
    };
  }

  const description = plainText(page.body_html).slice(0, 160) || `Informations ${page.title}.`;
  return {
    title: page.title,
    description,
    alternates: {
      canonical: `/pages/${slug}`
    },
    openGraph: {
      type: "article",
      title: page.title,
      description,
      url: `/pages/${slug}`
    },
    twitter: {
      card: "summary",
      title: page.title,
      description
    }
  };
}

export default async function StaticPage({ params }: StaticPageProps) {
  const { slug } = await params;
  const page = await fetchPublicContentPage(slug).catch(() => null);

  if (!page) {
    notFound();
  }

  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Page d'information</p>
      <h1 className="mt-2 font-display text-3xl text-ink">{page.title}</h1>
      <article
        className="prose prose-slate mt-5 max-w-none prose-headings:font-display prose-a:text-fuel"
        dangerouslySetInnerHTML={{ __html: page.body_html }}
      />
    </section>
  );
}
