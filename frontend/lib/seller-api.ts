import {
  SellerAuditLog,
  SellerBrand,
  SellerCategory,
  SellerContentPage,
  SellerInventoryItem,
  SellerInventorySource,
  SellerOrder,
  SellerOrderStatus,
  SellerProduct,
  SellerVariant
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

type ListPayload<T> = T[] | { items?: T[]; results?: T[] };

type SellerProductCreateInput = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  short_description?: string;
  description?: string;
  is_active?: boolean;
  is_featured?: boolean;
  badges?: string[];
  seo_title?: string;
  seo_description?: string;
};

type SellerVariantCreateInput = {
  product: string;
  sku: string;
  barcode?: string;
  price_amount: number;
  promo_price_amount?: number | null;
  is_active?: boolean;
};

type SellerInventoryItemCreateInput = {
  variant: string;
  source: string;
  qty_on_hand: number;
  low_stock_threshold?: number | null;
  lead_time_days?: number | null;
};

type SellerContentPageCreateInput = {
  slug: string;
  title: string;
  body_html: string;
  is_published?: boolean;
};

async function parseApiError(response: Response, path: string) {
  let detail = "";
  try {
    const payload = (await response.json()) as unknown;

    if (payload && typeof payload === "object") {
      const payloadRecord = payload as Record<string, unknown>;
      const detailValue = payloadRecord.detail;
      const nonFieldErrors = payloadRecord.non_field_errors;

      if (typeof detailValue === "string") {
        detail = detailValue;
      } else if (Array.isArray(nonFieldErrors) && nonFieldErrors.length > 0) {
        detail = String(nonFieldErrors[0] || "");
      } else {
        const firstKey = Object.keys(payloadRecord)[0];
        if (firstKey) {
          const raw = payloadRecord[firstKey];
          if (Array.isArray(raw) && raw.length > 0) {
            detail = String(raw[0]);
          } else if (typeof raw === "string") {
            detail = raw;
          }
        }
      }
    }
  } catch {
    detail = "";
  }

  const suffix = detail ? `: ${detail}` : "";
  throw new Error(`API error ${response.status} on ${path}${suffix}`);
}

async function sellerGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: token ? authHeaders(token) : undefined
  });
  if (!response.ok) {
    await parseApiError(response, path);
  }
  return (await response.json()) as T;
}

async function sellerMutation<T>(path: string, method: "POST" | "PATCH" | "DELETE", token: string, body?: unknown) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(token)
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    await parseApiError(response, path);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function normalizeList<T>(payload: ListPayload<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  if (Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
}

export async function sellerLogin(email: string, password: string): Promise<{ access: string; refresh: string }> {
  const response = await fetch(`${API_BASE}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on /auth/token/`);
  }
  return (await response.json()) as { access: string; refresh: string };
}

export async function fetchSellerProducts(token: string): Promise<SellerProduct[]> {
  const payload = await sellerGet<ListPayload<SellerProduct>>("/seller/products/", token);
  return normalizeList(payload);
}

export async function fetchSellerVariants(token: string): Promise<SellerVariant[]> {
  const payload = await sellerGet<ListPayload<SellerVariant>>("/seller/variants/", token);
  return normalizeList(payload);
}

export async function fetchSellerBrands(): Promise<SellerBrand[]> {
  const payload = await sellerGet<ListPayload<SellerBrand>>("/catalog/brands/");
  return normalizeList(payload);
}

export async function fetchSellerCategories(): Promise<SellerCategory[]> {
  const payload = await sellerGet<ListPayload<SellerCategory>>("/catalog/categories/");
  return normalizeList(payload);
}

export async function createSellerProduct(token: string, payload: SellerProductCreateInput): Promise<SellerProduct> {
  return sellerMutation<SellerProduct>("/seller/products/", "POST", token, payload);
}

export async function updateSellerProduct(
  token: string,
  productId: string,
  payload: Partial<SellerProductCreateInput>
): Promise<SellerProduct> {
  return sellerMutation<SellerProduct>(`/seller/products/${productId}/`, "PATCH", token, payload);
}

export async function deleteSellerProduct(token: string, productId: string): Promise<void> {
  await sellerMutation<void>(`/seller/products/${productId}/`, "DELETE", token);
}

export async function createSellerVariant(token: string, payload: SellerVariantCreateInput): Promise<SellerVariant> {
  return sellerMutation<SellerVariant>("/seller/variants/", "POST", token, payload);
}

export async function updateSellerVariant(
  token: string,
  variantId: string,
  payload: Partial<SellerVariantCreateInput>
): Promise<SellerVariant> {
  return sellerMutation<SellerVariant>(`/seller/variants/${variantId}/`, "PATCH", token, payload);
}

export async function deleteSellerVariant(token: string, variantId: string): Promise<void> {
  await sellerMutation<void>(`/seller/variants/${variantId}/`, "DELETE", token);
}

export async function fetchSellerInventoryItems(token: string): Promise<SellerInventoryItem[]> {
  const payload = await sellerGet<ListPayload<SellerInventoryItem>>("/seller/inventory/items/", token);
  return normalizeList(payload);
}

export async function fetchSellerInventorySources(token: string): Promise<SellerInventorySource[]> {
  const payload = await sellerGet<ListPayload<SellerInventorySource>>("/seller/inventory/sources/", token);
  return normalizeList(payload);
}

export async function createSellerInventoryItem(
  token: string,
  payload: SellerInventoryItemCreateInput
): Promise<SellerInventoryItem> {
  return sellerMutation<SellerInventoryItem>("/seller/inventory/items/", "POST", token, payload);
}

export async function updateSellerInventoryItem(
  token: string,
  itemId: string,
  payload: Partial<SellerInventoryItemCreateInput>
): Promise<SellerInventoryItem> {
  return sellerMutation<SellerInventoryItem>(`/seller/inventory/items/${itemId}/`, "PATCH", token, payload);
}

export async function deleteSellerInventoryItem(token: string, itemId: string): Promise<void> {
  await sellerMutation<void>(`/seller/inventory/items/${itemId}/`, "DELETE", token);
}

export async function fetchSellerOrders(token: string): Promise<SellerOrder[]> {
  const payload = await sellerGet<ListPayload<SellerOrder>>("/seller/orders/", token);
  return normalizeList(payload);
}

export async function updateSellerOrderStatus(
  token: string,
  orderId: string,
  status: SellerOrderStatus
): Promise<{ id: string; status: SellerOrderStatus }> {
  const response = await fetch(`${API_BASE}/seller/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on /seller/orders/${orderId}/status`);
  }
  return (await response.json()) as { id: string; status: SellerOrderStatus };
}

export async function fetchSellerContentPages(token: string): Promise<SellerContentPage[]> {
  const payload = await sellerGet<ListPayload<SellerContentPage>>("/seller/content/pages/", token);
  return normalizeList(payload);
}

export async function createSellerContentPage(
  token: string,
  payload: SellerContentPageCreateInput
): Promise<SellerContentPage> {
  return sellerMutation<SellerContentPage>("/seller/content/pages/", "POST", token, payload);
}

export async function updateSellerContentPage(
  token: string,
  pageId: string,
  payload: Partial<SellerContentPageCreateInput>
): Promise<SellerContentPage> {
  return sellerMutation<SellerContentPage>(`/seller/content/pages/${pageId}/`, "PATCH", token, payload);
}

export async function deleteSellerContentPage(token: string, pageId: string): Promise<void> {
  await sellerMutation<void>(`/seller/content/pages/${pageId}/`, "DELETE", token);
}

export async function fetchSellerAuditLogs(token: string): Promise<SellerAuditLog[]> {
  const payload = await sellerGet<ListPayload<SellerAuditLog>>("/seller/audit-logs/", token);
  return normalizeList(payload);
}
