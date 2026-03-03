"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { LoadingSpinner } from "@/components/loading-spinner";
import { formatFcfa } from "@/lib/currency";
import { availabilityLabel } from "@/lib/labels";
import { ProductListItem } from "@/lib/types";

function fcfa(value: number) {
  return formatFcfa(value);
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const [opening, setOpening] = useState(false);
  const imageUrl =
    product.thumbnail_url || `https://placehold.co/900x900/png?text=${encodeURIComponent(product.name)}`;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
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
      <p className="mobile-product-card-copy text-center text-xs uppercase text-slate-500 sm:line-clamp-1 sm:text-left">
        {product.brand_slug}
      </p>
      <h3 className="mobile-product-card-copy mt-1 min-h-[3rem] text-center font-display text-lg leading-6 text-ink sm:line-clamp-2 sm:text-left">
        {product.name}
      </h3>
      <p className="mobile-product-card-copy mt-1 text-center text-sm font-semibold text-fuel sm:text-left">
        {fcfa(product.min_promo_price ?? product.min_price)}
      </p>
      <p className="mobile-product-card-copy text-center text-xs text-slate-500 sm:text-left">
        {availabilityLabel(product.availability.status)}
      </p>
      <Link
        href={`/p/${product.slug}`}
        onClick={(event) => {
          if (event.button !== 0) {
            return;
          }
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          setOpening(true);
        }}
        aria-busy={opening}
        className="mt-auto flex justify-center pt-3 text-sm text-white transition"
      >
        <span className="inline-flex items-center justify-center rounded-lg bg-ink px-3 py-2 text-center transition group-hover:bg-fuel">
          {opening ? (
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner className="text-white" />
              Ouverture...
            </span>
          ) : (
            <span className="mobile-product-card-copy">Voir le produit</span>
          )}
        </span>
      </Link>
    </article>
  );
}
