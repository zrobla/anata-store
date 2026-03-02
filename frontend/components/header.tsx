import { fetchBrands, fetchCategories } from "@/lib/api";

import { HeaderClient } from "@/components/header-client";

export async function Header() {
  const [categories, brands] = await Promise.all([fetchCategories().catch(() => []), fetchBrands().catch(() => [])]);
  return <HeaderClient categories={categories} brands={brands} />;
}
