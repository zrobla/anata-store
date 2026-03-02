export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <section className="prose max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="font-display text-3xl">Article: {slug}</h1>
      <p>Lecture article depuis `/api/v1/content/blog/{slug}`.</p>
    </section>
  );
}
