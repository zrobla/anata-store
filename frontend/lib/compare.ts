export const COMPARE_STORAGE_KEY = "anata_compare_v1";
const MAX_COMPARE_ITEMS = 4;

export type CompareItem = {
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantSku: string;
  priceAmount: number;
  promoPriceAmount: number | null;
  availabilityStatus: "IN_STOCK" | "AVAILABLE_SOON" | "OUT_OF_STOCK";
  attributes: Array<{ attribute_key: string; value: string; label: string }>;
};

function hasWindow() {
  return typeof window !== "undefined";
}

export function readCompareItems(): CompareItem[] {
  if (!hasWindow()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompareItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCompareItems(items: CompareItem[]): CompareItem[] {
  if (!hasWindow()) {
    return items;
  }
  const normalized = items.slice(0, MAX_COMPARE_ITEMS);
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function upsertCompareItem(item: CompareItem): CompareItem[] {
  const current = readCompareItems();
  const filtered = current.filter((entry) => entry.variantId !== item.variantId);
  return writeCompareItems([item, ...filtered]);
}

export function removeCompareItem(variantId: string): CompareItem[] {
  const current = readCompareItems();
  return writeCompareItems(current.filter((entry) => entry.variantId !== variantId));
}

export function clearCompareItems(): CompareItem[] {
  return writeCompareItems([]);
}
