export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <section className="prose max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="font-display text-3xl">Page: {slug}</h1>
      <p>
        Contenu CMS public charge depuis `/api/v1/content/pages/{slug}` (garantie, retours, FAQ, livraison,
        contact).
      </p>
    </section>
  );
}
