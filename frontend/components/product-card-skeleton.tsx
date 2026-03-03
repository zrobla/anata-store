export function ProductCardSkeleton() {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="skeleton-shimmer mb-3 aspect-square rounded-xl" />
      <div className="skeleton-shimmer h-3 w-20 rounded" />
      <div className="skeleton-shimmer mt-2 h-4 w-full rounded" />
      <div className="skeleton-shimmer mt-2 h-4 w-4/5 rounded" />
      <div className="skeleton-shimmer mt-3 h-4 w-28 rounded" />
      <div className="skeleton-shimmer mt-2 h-3 w-24 rounded" />
      <div className="skeleton-shimmer mt-auto h-9 w-32 rounded-lg pt-3" />
    </article>
  );
}
