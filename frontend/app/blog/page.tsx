export default function BlogPage() {
  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl">Blog</h1>
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        Liste des articles publies depuis `/api/v1/content/blog`.
      </p>
    </section>
  );
}
