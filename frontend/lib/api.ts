import { Brand, Cart, Category, DeliveryZone, Order, Product, ProductListItem } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
type ProductFilters = { q?: string; category?: string; brand?: string };

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on ${path}`);
  }
  return response.json() as Promise<T>;
}

function normalizeProductPayload(payload: ProductListItem[] | { items?: ProductListItem[] }): ProductListItem[] {
  return Array.isArray(payload) ? payload : payload.items || [];
}

function buildProductsQuery(filters: ProductFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.brand) {
    params.set("brand", filters.brand);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function withCartSession(path: string, session?: string): string {
  if (!session) {
    return path;
  }
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}cart_session=${encodeURIComponent(session)}`;
}

export async function fetchHomeProducts(): Promise<ProductListItem[]> {
  const payload = await apiGet<ProductListItem[] | { items: ProductListItem[] }>("/products?page_size=8");
  return normalizeProductPayload(payload);
}

export async function fetchProducts(filters: ProductFilters = {}): Promise<ProductListItem[]> {
  const payload = await apiGet<ProductListItem[] | { items: ProductListItem[] }>(
    `/products${buildProductsQuery(filters)}`
  );
  return normalizeProductPayload(payload);
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  return apiGet<Product>(`/products/${slug}`);
}

export async function fetchCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/catalog/categories");
}

export async function fetchBrands(): Promise<Brand[]> {
  return apiGet<Brand[]>("/catalog/brands");
}

export async function fetchCart(session?: string): Promise<{ cart: Cart; session: string }> {
  const response = await fetch(`${API_BASE}${withCartSession("/cart", session)}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on /cart`);
  }
  const cart = (await response.json()) as Cart;
  const nextSession = response.headers.get("X-Cart-Session") || cart.session || session || "";
  return { cart, session: nextSession };
}

export async function addToCart(variantId: string, qty: number, session?: string): Promise<{ cart: Cart; session: string }> {
  const response = await fetch(`${API_BASE}${withCartSession("/cart/items", session)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ variant_id: variantId, qty })
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on /cart/items`);
  }
  const cart = (await response.json()) as Cart;
  const nextSession = response.headers.get("X-Cart-Session") || cart.session || session || "";
  return { cart, session: nextSession };
}

export async function updateCartItemQty(
  itemId: string,
  qty: number,
  session?: string
): Promise<{ cart: Cart; session: string }> {
  const response = await fetch(`${API_BASE}${withCartSession(`/cart/items/${itemId}`, session)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ qty })
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on /cart/items/${itemId}`);
  }
  const cart = (await response.json()) as Cart;
  const nextSession = response.headers.get("X-Cart-Session") || cart.session || session || "";
  return { cart, session: nextSession };
}

export async function removeCartItem(itemId: string, session?: string): Promise<{ cart: Cart; session: string }> {
  const response = await fetch(`${API_BASE}${withCartSession(`/cart/items/${itemId}`, session)}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on /cart/items/${itemId}`);
  }
  const cart = (await response.json()) as Cart;
  const nextSession = response.headers.get("X-Cart-Session") || cart.session || session || "";
  return { cart, session: nextSession };
}

export async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  return apiGet<DeliveryZone[]>("/delivery/zones");
}

export async function fetchMyOrders(token: string): Promise<Order[]> {
  const response = await fetch(`${API_BASE}/me/orders`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on /me/orders`);
  }
  const payload = (await response.json()) as { items: Order[] };
  return payload.items;
}

export async function fetchMyOrderDetail(token: string, orderId: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/me/orders/${orderId}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on /me/orders/${orderId}`);
  }
  return (await response.json()) as Order;
}

export async function loginClient(email: string, password: string): Promise<{ access: string; refresh: string }> {
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
