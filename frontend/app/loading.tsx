import { ProductGridSkeleton } from "@/components/product-grid-skeleton";

export default function Loading() {
  return (
    <section className="space-y-8">
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
        <div className="skeleton-shimmer h-8 w-72 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
      </div>
      <div className="space-y-4">
        <div className="skeleton-shimmer h-8 w-56 rounded-lg" />
        <ProductGridSkeleton count={8} />
      </div>
    </section>
  );
}
