"use client";

import { useRouter } from "next/navigation";

export function BackLink({ fallbackHref = "/", label = "Retour" }: { fallbackHref?: string; label?: string }) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
    >
      {label}
    </button>
  );
}
