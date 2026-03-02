# Data Model — Tech & Web Electronics E-commerce (V1 Legacy, P1)

> Mono-boutique. Aucune notion de marketplace visible client. COD uniquement. Pas de wishlist.

## 1) Catalog

### brand
- id (PK)
- name
- slug (unique)
- description
- logo_url
- is_active
- created_at / updated_at

### category
- id (PK)
- name
- slug (unique)
- parent_id (FK -> category.id, nullable)
- sort_order
- is_active

### attribute
- id (PK)
- key (unique) e.g. `ram`, `storage`, `color`
- label e.g. `RAM`
- type: TEXT | NUMBER | SELECT
- is_filterable (bool)
- sort_order

### attribute_value (optional table)
- id (PK)
- attribute_id (FK)
- value (string)
- label (string)
- sort_order

### product
- id (PK)
- name
- slug (unique)
- brand_id (FK)
- category_id (FK)
- short_description
- description (rich text / HTML)
- is_active
- is_featured
- badges (JSON array) e.g. ["Original", "Garantie 12 mois"]
- seo_title, seo_description (nullable)
- created_at / updated_at

### product_variant  **(unit of commerce)**
- id (PK)
- product_id (FK)
- sku (unique, required)
- barcode (nullable)
- price_amount (int XOF)
- promo_price_amount (nullable)
- is_active
- created_at / updated_at

### variant_attribute_value
- id (PK)
- variant_id (FK)
- attribute_key (string) OR attribute_id (FK)
- value (string) e.g. "8GB"
- label (nullable) e.g. "8 Go"
- unique(variant_id, attribute_key)

### media_asset
- id (PK)
- url
- alt
- kind IMAGE|VIDEO
- sort_order
- created_at

### product_media (M2M)
- id (PK)
- product_id (FK)
- media_asset_id (FK)
- sort_order

### variant_media (M2M)
- id (PK)
- variant_id (FK)
- media_asset_id (FK)
- sort_order


## 2) Inventory (sourcing interne unifié, jamais exposé client)

### inventory_source
- id (PK)
- name
- type: INTERNAL | PARTNER | CONSIGNMENT
- lead_time_days (nullable)
- is_active

### inventory_item  **(variant x source)**
- id (PK)
- variant_id (FK)
- source_id (FK)
- qty_on_hand (int)
- low_stock_threshold (int, nullable)
- lead_time_days (nullable override)
- unique(variant_id, source_id)

### stock_ledger
- id (PK)
- variant_id (FK)
- source_id (FK, nullable)
- movement_type: IN | OUT | ADJUST | RESERVE | RELEASE
- qty_delta (int) (+/-)
- reason
- actor_user_id
- created_at

### Availability contract (public)
- IN_STOCK if any INTERNAL qty > 0
- AVAILABLE_SOON if sum(PARTNER+CONSIGNMENT) > 0, lead_time = min(lead_time_days)
- OUT_OF_STOCK otherwise
- DO NOT expose source details publicly.


## 3) Cart & Checkout (COD)

### cart
- id (PK)
- owner_user_id (nullable)  # guest or logged-in
- currency (XOF)
- created_at / updated_at

### cart_item
- id (PK)
- cart_id (FK)
- variant_id (FK)
- qty (int)
- unit_price_amount (int XOF)  # snapshot
- created_at / updated_at
- unique(cart_id, variant_id)

### delivery_zone
- id (PK)
- name
- fee_amount (int XOF)
- eta_days_min / eta_days_max
- is_active

### order
- id (PK)
- order_number (unique)
- customer_user_id (nullable)
- status: NEW|CONFIRMED|PACKING|OUT_FOR_DELIVERY|DELIVERED|CANCELLED
- payment_method: COD
- address_json (AddressCI)
- delivery_zone_id (FK)
- subtotal_amount / delivery_fee_amount / total_amount (XOF)
- created_at / updated_at

### order_item
- id (PK)
- order_id (FK)
- variant_id (FK)
- product_snapshot_json (name, sku, attrs)
- qty (int)
- unit_price_amount (snapshot)
- line_total_amount

### stock_reservation (recommended)
- id (PK)
- order_id (FK)
- variant_id (FK)
- qty_reserved
- expires_at (nullable)
- status: ACTIVE|RELEASED|COMMITTED
- created_at

**Rule**
- At checkout COD: reserve stock (or commit if you prefer). Return 409 if cannot reserve.


## 4) Promotions (P1)

### deal
- id (PK)
- name
- starts_at / ends_at
- type: PERCENT|AMOUNT
- value
- scope: PRODUCT|CATEGORY|BRAND
- scope_ref_id
- is_active

### coupon
- id (PK)
- code (unique)
- description
- type: PERCENT|AMOUNT
- value
- min_cart_amount (nullable)
- max_uses (nullable)
- max_uses_per_user (nullable)
- starts_at / ends_at (nullable)
- is_active

### coupon_redemption
- id (PK)
- coupon_id (FK)
- order_id (FK)
- customer_user_id (nullable)
- redeemed_at


## 5) Bundles & Cross-sell

### bundle
- id (PK)
- name
- primary_product_id (FK)
- savings_amount (nullable)
- is_active

### bundle_item
- id (PK)
- bundle_id (FK)
- variant_id (FK)
- qty (int)


## 6) Trust: Reviews & QnA

### review
- id (PK)
- product_id (FK)
- customer_user_id (nullable)
- rating (1..5)
- title (nullable)
- body (nullable)
- status PENDING|APPROVED|REJECTED
- created_at

### product_question
- id (PK)
- product_id (FK)
- customer_user_id (nullable)
- question (text)
- status PENDING|APPROVED|REJECTED
- created_at

### product_answer
- id (PK)
- question_id (FK)
- seller_user_id (FK)
- answer (text)
- created_at


## 7) Content / CMS

### content_page
- id (PK)
- slug (unique)
- title
- body_html
- is_published
- updated_at

### blog_post
- id (PK)
- slug (unique)
- title
- excerpt
- body_html
- cover_image_url (nullable)
- is_published
- published_at (nullable)

### home_section
- id (PK)
- key (unique)
- type (enum)
- payload_json
- sort_order
- is_active


## 8) Seller Studio Security & Audit

### user
- id (PK)
- email/phone
- password_hash or external auth
- is_active
- created_at

### role
- id (PK)
- key (unique)
- name
- description

### permission
- id (PK)
- key (unique) e.g. orders.status

### user_role
- id (PK)
- user_id (FK)
- role_id (FK)

### role_permission
- id (PK)
- role_id (FK)
- permission_id (FK)

### audit_log
- id (PK)
- actor_user_id
- action
- resource
- resource_id
- before_json (nullable)
- after_json (nullable)
- created_at

**Audit rules**
- Any seller mutation: create audit_log entry.
- Keep before/after minimal (only changed fields) if storage is a concern.
