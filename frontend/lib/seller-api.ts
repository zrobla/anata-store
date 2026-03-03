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
  SellerProductImportReport,
  SellerVariant
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
const SELLER_ACCESS_TOKEN_KEY = "seller_access_token";
const SELLER_REFRESH_TOKEN_KEY = "seller_refresh_token";
const SELLER_EMAIL_KEY = "seller_email";

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

function getStoredValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(key) || "";
}

function setStoredValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, value);
}

function clearStoredSellerAuth() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SELLER_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(SELLER_REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(SELLER_EMAIL_KEY);
  window.dispatchEvent(new CustomEvent("seller-logout"));
}

function resolveAccessToken(passedToken?: string) {
  const storedAccess = getStoredValue(SELLER_ACCESS_TOKEN_KEY);
  if (storedAccess) {
    return storedAccess;
  }
  return passedToken || "";
}

async function refreshSellerAccessToken() {
  const refresh = getStoredValue(SELLER_REFRESH_TOKEN_KEY);
  if (!refresh) {
    return "";
  }

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh })
  });
  if (!response.ok) {
    clearStoredSellerAuth();
    return "";
  }

  const payload = (await response.json()) as { access?: string; refresh?: string };
  if (!payload.access) {
    clearStoredSellerAuth();
    return "";
  }

  setStoredValue(SELLER_ACCESS_TOKEN_KEY, payload.access);
  if (payload.refresh) {
    setStoredValue(SELLER_REFRESH_TOKEN_KEY, payload.refresh);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("seller-token-updated", { detail: { access: payload.access } }));
  }
  return payload.access;
}

type SellerRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  useAuth?: boolean;
  body?: BodyInit;
  headers?: Record<string, string>;
  cache?: RequestCache;
};

async function requestSeller(path: string, options: SellerRequestOptions = {}) {
  const { method = "GET", token, useAuth = false, body, headers = {}, cache = "no-store" } = options;
  const endpoint = `${API_BASE}${path}`;

  async function sendRequest(accessToken?: string) {
    return fetch(endpoint, {
      method,
      cache,
      headers: {
        ...headers,
        ...(useAuth && accessToken ? authHeaders(accessToken) : {})
      },
      body
    });
  }

  let accessToken = useAuth ? resolveAccessToken(token) : "";
  let response = await sendRequest(accessToken);
  if (response.status !== 401 || !useAuth) {
    return response;
  }

  const refreshedAccessToken = await refreshSellerAccessToken();
  if (!refreshedAccessToken) {
    return response;
  }
  accessToken = refreshedAccessToken;
  response = await sendRequest(accessToken);
  return response;
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
  const response = await requestSeller(path, {
    method: "GET",
    token,
    useAuth: token !== undefined,
    cache: "no-store"
  });
  if (!response.ok) {
    await parseApiError(response, path);
  }
  return (await response.json()) as T;
}

async function sellerMutation<T>(path: string, method: "POST" | "PATCH" | "DELETE", token: string, body?: unknown) {
  const response = await requestSeller(path, {
    method,
    token,
    useAuth: true,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
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

export async function downloadSellerProductImportTemplate(token: string): Promise<Blob> {
  const path = "/seller/products/import/template";
  const response = await requestSeller(path, {
    method: "GET",
    token,
    useAuth: true,
    cache: "no-store"
  });
  if (!response.ok) {
    await parseApiError(response, path);
  }
  return response.blob();
}

export async function importSellerProductsExcel(
  token: string,
  file: File
): Promise<SellerProductImportReport> {
  const path = "/seller/products/import/excel";
  const formData = new FormData();
  formData.append("file", file);

  const response = await requestSeller(path, {
    method: "POST",
    token,
    useAuth: true,
    body: formData
  });
  if (!response.ok) {
    await parseApiError(response, path);
  }
  return (await response.json()) as SellerProductImportReport;
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
  const path = `/seller/orders/${orderId}/status`;
  const response = await requestSeller(path, {
    method: "PATCH",
    token,
    useAuth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    await parseApiError(response, path);
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
