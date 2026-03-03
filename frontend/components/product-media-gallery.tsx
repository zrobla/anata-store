"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type MediaItem = {
  id: string;
  url: string;
  alt: string;
  kind: "IMAGE" | "VIDEO";
};

type ProductMediaGalleryProps = {
  productName: string;
  media: MediaItem[];
};

function placeholder(productName: string) {
  return `https://placehold.co/1200x1200/png?text=${encodeURIComponent(productName)}`;
}

export function ProductMediaGallery({ productName, media }: ProductMediaGalleryProps) {
  const images = useMemo(() => {
    const list = media.filter((item) => item.kind === "IMAGE");
    if (list.length > 0) {
      return list;
    }
    return [
      {
        id: "placeholder",
        url: placeholder(productName),
        alt: productName,
        kind: "IMAGE" as const
      }
    ];
  }, [media, productName]);

  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] || images[0];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
        <Image
          src={active?.url || placeholder(productName)}
          alt={active?.alt || productName}
          fill
          unoptimized
          referrerPolicy="no-referrer"
          sizes="(max-width: 1280px) 100vw, 52vw"
          className="object-contain p-4"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((item, index) => {
            const activeThumb = index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative aspect-square overflow-hidden rounded-xl border transition ${
                  activeThumb
                    ? "border-cyan-600 ring-1 ring-cyan-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                aria-label={`Afficher image ${index + 1}`}
              >
                <Image
                  src={item.url}
                  alt={item.alt || `${productName} image ${index + 1}`}
                  fill
                  unoptimized
                  referrerPolicy="no-referrer"
                  sizes="160px"
                  className="object-contain p-2"
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
