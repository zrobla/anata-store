export function TrustStrip() {
  const items = [
    "Livraison rapide 24h-72h",
    "Paiement COD securise",
    "Garantie & support Anata",
    "Produits 100% verifies"
  ];

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
        {items.map((item) => (
          <p
            key={item}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
          >
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
