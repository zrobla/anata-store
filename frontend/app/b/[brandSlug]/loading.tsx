import { ProductGridSkeleton } from "@/components/product-grid-skeleton";

export default function Loading() {
  return (
    <section className="space-y-4">
      <div className="skeleton-shimmer h-5 w-36 rounded" />
      <div className="skeleton-shimmer h-9 w-64 rounded-lg" />
      <ProductGridSkeleton count={8} />
    </section>
  );
}
