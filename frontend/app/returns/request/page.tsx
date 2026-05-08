export default function ReturnRequestPage() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="font-display text-3xl">Demande de retour</h1>
      <p className="mt-2 text-sm text-slate-600">Formulaire de demande de retour produit.</p>
      <form className="mt-5 grid gap-3">
        <input className="rounded-lg border px-3 py-2" placeholder="Numéro de commande" />
        <textarea className="rounded-lg border px-3 py-2" placeholder="Motif du retour" rows={4} />
        <button type="button" className="rounded-lg bg-ink px-4 py-2 text-sm text-white">
          Envoyer
        </button>
      </form>
    </section>
  );
}
