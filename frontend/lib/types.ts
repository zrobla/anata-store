export type Availability = {
  status: "IN_STOCK" | "AVAILABLE_SOON" | "OUT_OF_STOCK";
  lead_time_days?: number | null;
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  category_slug: string;
  brand_slug: string;
  thumbnail_url: string;
  min_price: number;
  min_promo_price: number | null;
  availability: Availability;
  badges: string[];
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  badges: string[];
  media: Array<{ id: string; url: string; alt: string; kind: "IMAGE" | "VIDEO" }>;
  variants: Array<{
    id: string;
    sku: string;
    price_amount: number;
    promo_price_amount: number | null;
    availability: Availability;
    attributes: Array<{ attribute_key: string; value: string; label: string }>;
  }>;
};

export type Cart = {
  id: string;
  currency: string;
  session?: string;
  items: Array<{
    id: string;
    variant: string;
    variant_sku: string;
    product_name: string;
    variant_attributes: Array<{ attribute_key: string; value: string; label: string }>;
    availability: Availability;
    qty: number;
    unit_price_amount: number;
  }>;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  is_active: boolean;
};

export type DeliveryZone = {
  id: string;
  name: string;
  fee_amount: number;
  eta_days_min: number;
  eta_days_max: number;
  is_active: boolean;
};

export type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_method: "COD";
  address_json?: Record<string, string>;
  delivery_zone?: string;
  subtotal_amount: number;
  delivery_fee_amount: number;
  total_amount: number;
  created_at: string;
  items: Array<{
    id: string;
    qty: number;
    unit_price_amount: number;
    line_total_amount: number;
    product_snapshot_json: { name?: string; sku?: string };
  }>;
};

export type PublicContentPage = {
  id: string;
  slug: string;
  title: string;
  body_html: string;
  is_published: boolean;
  updated_at: string;
};

export type SellerProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  short_description: string;
  description: string;
  is_active: boolean;
  is_featured: boolean;
  badges: string[];
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
};

export type SellerBrand = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  is_active: boolean;
};

export type SellerCategory = {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  sort_order: number;
  is_active: boolean;
};

export type SellerVariant = {
  id: string;
  product: string;
  sku: string;
  barcode: string;
  price_amount: number;
  promo_price_amount: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SellerInventoryItem = {
  id: string;
  variant: string;
  source: string;
  qty_on_hand: number;
  low_stock_threshold: number | null;
  lead_time_days: number | null;
  created_at: string;
  updated_at: string;
};

export type SellerInventorySource = {
  id: string;
  name: string;
  type: "INTERNAL" | "PARTNER" | "CONSIGNMENT";
  lead_time_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SellerOrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PACKING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type SellerOrder = {
  id: string;
  order_number: string;
  status: SellerOrderStatus;
  payment_method: "COD";
  address_json: Record<string, string>;
  delivery_zone: string;
  subtotal_amount: number;
  delivery_fee_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    variant: string;
    product_snapshot_json: { name?: string; sku?: string };
    qty: number;
    unit_price_amount: number;
    line_total_amount: number;
  }>;
};

export type SellerContentPage = {
  id: string;
  slug: string;
  title: string;
  body_html: string;
  is_published: boolean;
  updated_at: string;
};

export type SellerAuditLog = {
  id: string;
  actor_user: string | null;
  action: string;
  resource: string;
  resource_id: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  request_id: string;
  ip_address: string | null;
  created_at: string;
};

export type SellerProductImportError = {
  row: number;
  error: string;
  product_slug?: string;
  variant_sku?: string;
};

export type SellerProductImportReport = {
  required_columns: string[];
  total_rows: number;
  processed_rows: number;
  skipped_empty_rows: number;
  created: {
    products: number;
    variants: number;
    inventory_sources: number;
    inventory_items: number;
    media_assets: number;
    media_links: number;
  };
  updated: {
    products: number;
    variants: number;
    inventory_sources: number;
    inventory_items: number;
  };
  errors: SellerProductImportError[];
};
