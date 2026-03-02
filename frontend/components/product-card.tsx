import Image from "next/image";
import Link from "next/link";

import { formatFcfa } from "@/lib/currency";
import { availabilityLabel } from "@/lib/labels";
import { ProductListItem } from "@/lib/types";

function fcfa(value: number) {
  return formatFcfa(value);
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const imageUrl =
    product.thumbnail_url || `https://placehold.co/900x900/png?text=${encodeURIComponent(product.name)}`;

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          unoptimized
          referrerPolicy="no-referrer"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-contain p-3 transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <p className="text-xs uppercase text-slate-500">{product.brand_slug}</p>
      <h3 className="mt-1 font-display text-lg text-ink">{product.name}</h3>
      <p className="mt-3 text-sm font-semibold text-fuel">{fcfa(product.min_promo_price ?? product.min_price)}</p>
      <p className="text-xs text-slate-500">{availabilityLabel(product.availability.status)}</p>
      <Link
        href={`/p/${product.slug}`}
        className="mt-4 inline-flex rounded-lg bg-ink px-3 py-2 text-sm text-white transition group-hover:bg-fuel"
      >
        Voir le produit
      </Link>
    </article>
  );
}
